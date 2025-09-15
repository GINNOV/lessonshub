// file: src/app/api/lessons/multi-choice/route.ts
export const runtime = 'nodejs';

import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Role, LessonType } from "@prisma/client";

export async function POST(request: Request) {
  const session = await auth();
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

    // Use a nested write to create the lesson and its related questions/options
    // in a single, transactionally-safe operation.
    const newLesson = await prisma.lesson.create({
      data: {
        title,
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

    return NextResponse.json(newLesson, { status: 201 });
  } catch (error) {
    console.error("MULTI_CHOICE_LESSON_CREATE_ERROR", error);
    return new NextResponse(
      JSON.stringify({ error: "Failed to create multi-choice lesson" }),
      { status: 500 }
    );
  }
}