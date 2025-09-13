// file: src/app/api/lessons/flashcard/[lessonId]/route.ts
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
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, flashcards } = body;

    if (!title || !flashcards || !Array.isArray(flashcards) || flashcards.length === 0) {
      return new NextResponse(JSON.stringify({ error: "Title and at least one flashcard are required." }), { status: 400 });
    }

    // Ensure the lesson exists and belongs to the teacher before updating
    const lesson = await prisma.lesson.findFirst({
        where: { id: lessonId, teacherId: session.user.id }
    });

    if (!lesson) {
        return new NextResponse(JSON.stringify({ error: "Lesson not found or you don't have permission to edit it." }), { status: 404 });
    }

    const updatedLesson = await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        title,
        type: LessonType.FLASHCARD,
        flashcards: {
      deleteMany: {}, // Deletes all old flashcards linked to this lesson
      create: flashcards, // Creates all the new flashcards from your array
    },
      },
    });

    return NextResponse.json(updatedLesson, { status: 200 });
  } catch (error) {
    console.error("FLASHCARD_LESSON_UPDATE_ERROR", error);
    return new NextResponse(JSON.stringify({ error: "Failed to update flashcard lesson" }), { status: 500 });
  }
}
