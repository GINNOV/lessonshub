// file: src/app/api/lessons/multi-choice/route.ts
export const runtime = 'nodejs';

import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Role, LessonType, AssignmentNotification } from "@prisma/client";
import { autoAssignLessonToAllStudents } from "@/lib/lessonAssignments";

export async function POST(request: Request) {
  const session = await auth();
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
      attachment_url,
      notes,
      assignment_image_url,
      soundcloud_url,
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

    const difficultyValue = Number(difficulty);
    if (!Number.isInteger(difficultyValue) || difficultyValue < 1 || difficultyValue > 5) {
      return new NextResponse(
        JSON.stringify({
          error: "Difficulty must be an integer between 1 and 5.",
        }),
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

    // Use a nested write to create the lesson and its related questions/options
    // in a single, transactionally-safe operation.
    const newLesson = await prisma.lesson.create({
      data: {
        title,
        price,
        difficulty: difficultyValue,
        lesson_preview,
        assignment_text,
        assignment_image_url,
        soundcloud_url,
        attachment_url,
        notes,
        assignment_notification: assignmentNotification,
        scheduled_assignment_date: scheduledAssignmentDate,
        type: LessonType.MULTI_CHOICE, // Use the enum for type safety
        teacherId: session.user.id,
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
    });

    await autoAssignLessonToAllStudents({
      lessonId: newLesson.id,
      lessonTitle: newLesson.title,
      assignmentNotification,
      scheduledAssignmentDate,
      teacherName: session.user.name,
    });
    return NextResponse.json(newLesson, { status: 201 });
  } catch (error) {
    console.error("MULTI_CHOICE_LESSON_CREATE_ERROR", error);
    return new NextResponse(
      JSON.stringify({ error: "Failed to create multi-choice lesson" }),
      { status: 500 }
    );
  }
}
