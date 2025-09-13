// file: src/app/api/lessons/flashcard/route.ts
export const runtime = 'nodejs';

import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Role, LessonType } from "@prisma/client";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== Role.TEACHER) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, flashcards } = body;

    if (!title || !flashcards || !Array.isArray(flashcards) || flashcards.length === 0) {
      return new NextResponse(JSON.stringify({ error: "Title and at least one flashcard are required." }), { status: 400 });
    }

    // The Prisma call now works with the optional field
    const newLesson = await prisma.lesson.create({
      data: {
        title,
        type: LessonType.FLASHCARD,
        flashcards: {
      create: flashcards, 
    },
        teacherId: session.user.id,
      },
    });

    return NextResponse.json(newLesson, { status: 201 });
  } catch (error) {
    console.error("FLASHCARD_LESSON_CREATE_ERROR", error);
    return new NextResponse(JSON.stringify({ error: "Failed to create flashcard lesson" }), { status: 500 });
  }
}