// file: src/app/api/lessons/flashcard/route.ts
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Role, LessonType } from "@prisma/client";

export async function POST(request: Request) {
  const session = await auth();
  if (!session || !session.user || session.user.role !== Role.TEACHER) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const body = await request.json();
  const { title, lesson_preview, assignment_text, attachment_url, flashcards } = body;

  if (!title || !flashcards || flashcards.length === 0) {
    return new NextResponse(
      JSON.stringify({ error: "Title and at least one flashcard are required" }),
      { status: 400 }
    );
  }

  try {
    const newLesson = await prisma.lesson.create({
      data: {
        title: title,
        lesson_preview: lesson_preview,
        assignment_text: assignment_text,
        attachment_url: attachment_url,
        type: LessonType.FLASHCARD,
        teacherId: session.user.id,
        flashcards: {
          create: flashcards.map((fc: { term: string; definition: string; termImageUrl?: string, definitionImageUrl?: string }) => ({
            term: fc.term,
            definition: fc.definition,
            termImageUrl: fc.termImageUrl,
            definitionImageUrl: fc.definitionImageUrl,
          })),
        },
      },
    });
    return NextResponse.json(newLesson, { status: 201 });
  } catch (error) {
    console.error("FLASHCARD_LESSON_CREATE_ERROR", error);
    return new NextResponse(
      JSON.stringify({ error: "Failed to create flashcard lesson" }),
      { status: 500 }
    );
  }
}