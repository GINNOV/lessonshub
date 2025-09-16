// file: src/app/api/lessons/[lessonId]/route.ts
import { auth } from "@/auth";
import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const session = await auth();
  const { lessonId } = await params; // Correctly await the params

  if (!session?.user?.id || session.user.role !== Role.TEACHER) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  try {
    const body = await request.json();
    const { title, price, lesson_preview, assignmentText, questions, contextText, assignment_image_url, soundcloud_url, attachment_url, notes, assignment_notification, scheduled_assignment_date } = body;

    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });

    if (!lesson || lesson.teacherId !== session.user.id) {
        return new NextResponse(JSON.stringify({ error: "Lesson not found or you do not have permission to edit it" }), { status: 404 });
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
    console.error("LESSON_UPDATE_ERROR", error);
    return new NextResponse(
      JSON.stringify({ error: "Failed to update lesson" }),
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const session = await auth();
  const { lessonId } = await params;

  if (!session?.user?.id || session.user.role !== Role.TEACHER) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  try {
      const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });

      if (!lesson || lesson.teacherId !== session.user.id) {
          return new NextResponse(JSON.stringify({ error: "Lesson not found or you do not have permission to delete it" }), { status: 404 });
      }

      await prisma.lesson.delete({ where: { id: lessonId } });

      return new NextResponse(null, { status: 204 });
  } catch (error) {
      console.error("LESSON_DELETE_ERROR", error);
      return new NextResponse(JSON.stringify({ error: "Failed to delete lesson" }), { status: 500 });
  }
}