// file: src/app/api/assignments/[assignmentId]/submit/route.ts
export const runtime = 'nodejs';

import { auth } from "@/auth";
import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import {
  completeFlashcardAssignment,
  completeNewsArticleAssignment,
  submitMultiChoiceAssignment,
  submitStandardAssignment,
  submitComposerAssignment,
} from "@/actions/lessonActions";
import { validateAssignmentForSubmission } from "@/lib/assignmentValidation";
import { LessonType, Role } from "@prisma/client";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== Role.STUDENT) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const { assignmentId } = await params;
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId, studentId: session.user.id },
    select: {
      lesson: { select: { type: true } },
      deadline: true,
      status: true,
    },
  });

  if (!assignment) {
    return new NextResponse(JSON.stringify({ error: "Assignment not found." }), {
      status: 404,
    });
  }
  
  const validation = validateAssignmentForSubmission(assignment);
  if (!validation.ok) {
    return new NextResponse(
      JSON.stringify({ error: validation.error }),
      { status: validation.reason === 'deadline' ? 403 : 400 }
    );
  }

  try {
    const lessonType = assignment.lesson.type;
    const body = await request.json();

    if (lessonType === LessonType.FLASHCARD) {
      const result = await completeFlashcardAssignment(assignmentId, session.user.id);
      if (!result.success) return new NextResponse(JSON.stringify({ error: result.error }), { status: 400 });
      return NextResponse.json(result);
    }

    if (lessonType === LessonType.NEWS_ARTICLE) {
      const { rating } = body;
      const result = await completeNewsArticleAssignment(assignmentId, session.user.id, rating);
      if (!result.success) return new NextResponse(JSON.stringify({ error: result.error }), { status: 400 });
      return NextResponse.json(result);
    }

    if (lessonType === LessonType.MULTI_CHOICE) {
      const { answers } = body;
      const result = await submitMultiChoiceAssignment(assignmentId, session.user.id, answers);
      if (!result.success) return new NextResponse(JSON.stringify({ error: result.error }), { status: 400 });
      return NextResponse.json(result.data);
    }
    
    if (lessonType === LessonType.STANDARD) {
        const { answers, studentNotes, rating } = body;
        const result = await submitStandardAssignment(assignmentId, session.user.id, { answers, studentNotes, rating });
        if (!result.success) return new NextResponse(JSON.stringify({ error: result.error }), { status: 400 });
        return NextResponse.json(result.data);
    }

    if (lessonType === LessonType.COMPOSER) {
      const { answers, rating, tries } = body;
      const result = await submitComposerAssignment(assignmentId, session.user.id, {
        answers,
        tries,
        rating,
      });
      if (!result.success) return new NextResponse(JSON.stringify({ error: result.error }), { status: 400 });
      return NextResponse.json(result.data);
    }

    return new NextResponse(JSON.stringify({ error: "This lesson type cannot be submitted this way." }), { status: 400 });

  } catch (error) {
     console.error(`SUBMIT_ERROR`, error);
     return new NextResponse(JSON.stringify({ error: "Failed to submit response" }), { status: 500 });
  }
}
