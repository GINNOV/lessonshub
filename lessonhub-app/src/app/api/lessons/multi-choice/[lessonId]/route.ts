// file: src/app/api/lessons/multi-choice/[lessonId]/route.ts
export const runtime = 'nodejs';

import { auth } from "@/auth";
import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { Role, LessonType } from "@prisma/client";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { lessonId: string } }
) {
  const session = await auth();
  const { lessonId } = params;

  if (!session?.user?.id || session.user.role !== Role.TEACHER) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  try {
    const body = await request.json();
    const { title, questions } = body;

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

    // Ensure the lesson exists and belongs to the teacher before updating
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

    // ✅ FIX: Use a transaction to safely delete old questions and create new ones.
    const [deleteResult, updatedLesson] = await prisma.$transaction([
      // Step 1: Delete all existing questions related to this lesson
      prisma.multiChoiceQuestion.deleteMany({
        where: { lessonId: lessonId },
      }),
      // Step 2: Update the lesson title and create the new set of questions
      prisma.lesson.update({
        where: { id: lessonId },
        data: {
          title,
          type: LessonType.MULTI_CHOICE,
          // This nested write is identical to the POST route's logic
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