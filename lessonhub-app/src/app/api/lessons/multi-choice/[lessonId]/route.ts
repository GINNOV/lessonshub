// file: src/app/api/lessons/multi-choice/[lessonId]/route.ts
export const runtime = 'nodejs';

import { auth } from "@/auth";
import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { Role, LessonType } from "@prisma/client";
import { parseMultiChoiceLessonPayload } from "@/lib/multiChoiceLessonPayload";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const session = await auth();
  const { lessonId } = await params;

  if (!session?.user?.id || session.user.role !== Role.TEACHER) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  try {
    const body = await request.json();
    const parsed = parseMultiChoiceLessonPayload(body);
    if (!parsed.ok) {
      return new NextResponse(
        JSON.stringify({ error: parsed.error }),
        { status: 400 }
      );
    }
    const {
      title,
      questions,
      price,
      difficulty,
      lesson_preview,
      assignment_text,
      assignment_image_url,
      soundcloud_url,
      attachment_url,
      notes,
      assignmentNotification,
      scheduledAssignmentDate,
      isFreeForAll,
    } = parsed.data;

    const lesson = await prisma.lesson.findFirst({
      where: { id: lessonId, teacherId: session.user.id },
    });

    if (!lesson) {
      return new NextResponse(
        JSON.stringify({
          error: "Lesson not found or you don't have permission to edit it.",
        }),
        { status: 404 }
      );
    }

    const [, updatedLesson] = await prisma.$transaction([
      prisma.multiChoiceQuestion.deleteMany({
        where: { lessonId: lessonId },
      }),
      prisma.lesson.update({
        where: { id: lessonId },
        data: {
          title,
          price,
          type: LessonType.MULTI_CHOICE,
          lesson_preview,
          assignment_text,
          assignment_image_url,
          soundcloud_url,
          attachment_url,
          notes,
          difficulty,
          assignment_notification: assignmentNotification,
          scheduled_assignment_date: scheduledAssignmentDate,
          isFreeForAll: Boolean(isFreeForAll),
          multiChoiceQuestions: {
            create: questions.map((q) => ({
              question: q.question,
              options: {
                create: q.options.map((opt) => ({
                  text: opt.text,
                  isCorrect: opt.isCorrect,
                })),
              },
            })),
          },
        },
      }),
    ]);

    return NextResponse.json(updatedLesson, { status: 200 });
  } catch (error) {
    console.error("MULTI_CHOICE_LESSON_UPDATE_ERROR", error);
    return new NextResponse(
      JSON.stringify({ error: "Failed to update multi-choice lesson" }),
      { status: 500 }
    );
  }
}
