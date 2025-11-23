// file: src/app/api/lessons/multi-choice/[lessonId]/route.ts
export const runtime = 'nodejs';

import { auth } from "@/auth";
import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { Role, LessonType, AssignmentNotification } from "@prisma/client";

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
      assignment_notification,
      scheduled_assignment_date,
    } = body;
    const assignmentNotification = assignment_notification ?? AssignmentNotification.NOT_ASSIGNED;
    const rawScheduledAssignmentDate = scheduled_assignment_date
      ? new Date(scheduled_assignment_date)
      : null;
    const scheduledAssignmentDate =
      rawScheduledAssignmentDate && !Number.isNaN(rawScheduledAssignmentDate.getTime())
        ? rawScheduledAssignmentDate
        : null;

    if (
      !title ||
      !questions ||
      !Array.isArray(questions) ||
      questions.length === 0
    ) {
      return new NextResponse(
        JSON.stringify({
          error: "Title and at least one question are required.",
        }),
        { status: 400 }
      );
    }

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

    const difficultyValue = Number(difficulty);
    if (!Number.isInteger(difficultyValue) || difficultyValue < 1 || difficultyValue > 5) {
      return new NextResponse(
        JSON.stringify({ error: "Difficulty must be an integer between 1 and 5." }),
        { status: 400 }
      );
    }

    if (
      assignmentNotification === AssignmentNotification.ASSIGN_ON_DATE &&
      (!scheduledAssignmentDate || Number.isNaN(scheduledAssignmentDate.getTime()))
    ) {
      return new NextResponse(
        JSON.stringify({ error: "A valid scheduled assignment date is required." }),
        { status: 400 }
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
          difficulty: difficultyValue,
          assignment_notification: assignmentNotification,
          scheduled_assignment_date: scheduledAssignmentDate,
          multiChoiceQuestions: {
            create: questions.map((q: any) => ({
              question: q.question,
              options: {
                create: q.options.map((opt: any) => ({
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
