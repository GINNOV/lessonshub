// file: src/app/api/lessons/[lessonId]/route.ts

import { auth } from "@/auth";
import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";

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
    const { title, price, lesson_preview, assignmentText, questions, contextText, assignment_image_url, soundcloud_url, attachment_url, notes, assignment_notification, scheduled_assignment_date } = body;


    if (!title || !assignmentText) {
      return new NextResponse(
        JSON.stringify({ error: "Title and assignment text are required" }),
        { status: 400 }
      );
    }

    // Ensure the lesson exists and belongs to the logged-in teacher before updating
    const lesson = await prisma.lesson.findFirst({
      where: {
        id: lessonId,
        teacherId: session.user.id,
      },
    });

    if (!lesson) {
      return new NextResponse(
        JSON.stringify({ error: "Lesson not found or you don't have permission to edit it." }),
        { status: 404 }
      );
    }

    const updatedLesson = await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        title,
        price,
        lesson_preview,
        assignment_text: assignmentText,
        questions,
        context_text: contextText,
        assignment_image_url,
        soundcloud_url,
        attachment_url,
        notes,
        assignment_notification,
        scheduled_assignment_date,
      },
    });

    return NextResponse.json(updatedLesson, { status: 200 });
  } catch (error) {
    console.error("UPDATE_LESSON_ERROR", error);
    return new NextResponse(
      JSON.stringify({ error: "Failed to update lesson" }),
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    // First, verify that the lesson belongs to the teacher making the request
    const lesson = await prisma.lesson.findFirst({
      where: {
        id: lessonId,
        teacherId: session.user.id,
      },
    });

    if (!lesson) {
      return new NextResponse(
        JSON.stringify({ error: "Lesson not found or you don't have permission to delete it." }),
        { status: 404 }
      );
    }

    // If the lesson exists and belongs to the teacher, delete it
    await prisma.lesson.delete({
      where: { id: lessonId },
    });

    return new NextResponse(null, { status: 204 }); // 204 No Content for successful deletion
  } catch (error) {
    console.error("DELETE_LESSON_ERROR", error);
    return new NextResponse(
      JSON.stringify({ error: "Failed to delete lesson" }),
      { status: 500 }
    );
  }
}

