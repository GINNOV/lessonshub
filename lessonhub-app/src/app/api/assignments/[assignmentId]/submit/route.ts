// file: lessonhub-app/src/app/api/assignments/[assignmentId]/submit/route.ts
export const runtime = 'nodejs';

import { auth } from "@/auth";
import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { completeFlashcardAssignment, submitMultiChoiceAssignment } from "@/actions/lessonActions";
import { LessonType, Role } from "@prisma/client";

export async function POST(
  request: NextRequest,
  { params }: { params: { assignmentId: string } }
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== Role.STUDENT) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { assignmentId } = params;
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    select: { lesson: { select: { type: true } } },
  });

  if (!assignment) {
      return new NextResponse(JSON.stringify({ error: "Assignment not found." }), { status: 404 });
  }

  // Route logic based on lesson type
  if (assignment.lesson.type === LessonType.FLASHCARD) {
      const result = await completeFlashcardAssignment(assignmentId, session.user.id);
      if (!result.success) return new NextResponse(JSON.stringify({ error: result.error }), { status: 400 });
      return NextResponse.json(result);
  }

  if (assignment.lesson.type === LessonType.MULTI_CHOICE) {
      const body = await request.json();
      const { answers } = body;
      const result = await submitMultiChoiceAssignment(assignmentId, session.user.id, answers);
      if (!result.success) return new NextResponse(JSON.stringify({ error: result.error }), { status: 400 });
      return NextResponse.json(result.data);
  }

  return new NextResponse(JSON.stringify({ error: "This lesson type cannot be submitted this way." }), { status: 400 });
}