// file: src/app/api/lessons/route.ts

import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function POST(request: Request) {
  const session = await auth();
  if (!session || !session.user || session.user.role !== Role.TEACHER) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const body = await request.json();
  // Ensure 'assignment_image_url' is destructured here
  const { title, lesson_preview, assignmentText, contextText, assignment_image_url, attachment_url, notes, visible_after } = body; 

  if (!title || !assignmentText) {
    return new NextResponse(
      JSON.stringify({ error: "Title and assignment text are required" }),
      { status: 400 }
    );
  }

  try {
    const newLesson = await prisma.lesson.create({
      data: {
        title: title,
        lesson_preview,
        assignment_text: assignmentText,
        context_text: contextText,
        assignment_image_url: assignment_image_url,
        attachment_url,
        notes,
        visible_after,
        teacherId: session.user.id,
      },
    });

    return NextResponse.json(newLesson, { status: 201 });
  } catch (error) {
    console.error("Error creating lesson:", error);
    return new NextResponse(
      JSON.stringify({ error: "Failed to create lesson" }),
      { status: 500 }
    );
  }
}