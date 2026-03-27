// file: src/app/api/lessons/multi-choice/route.ts
export const runtime = 'nodejs';

import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Role, LessonType } from "@prisma/client";
import { autoAssignLessonToAllStudents } from "@/lib/lessonAssignments";
import { parseMultiChoiceLessonPayload } from "@/lib/multiChoiceLessonPayload";

export async function POST(request: Request) {
  const session = await auth();
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
      attachment_url,
      notes,
      assignment_image_url,
      soundcloud_url,
      assignmentNotification,
      scheduledAssignmentDate,
      isFreeForAll,
    } = parsed.data;

    // Use a nested write to create the lesson and its related questions/options
    // in a single, transactionally-safe operation.
    const newLesson = await prisma.lesson.create({
      data: {
        title,
        price,
        difficulty,
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
