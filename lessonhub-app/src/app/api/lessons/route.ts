// file: src/app/api/lessons/route.ts

import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";
import { autoAssignLessonToAllStudents } from "@/lib/lessonAssignments";
import { parseStandardLessonPayload } from "@/lib/standardLessonPayload";

export async function POST(request: Request) {
  const session = await auth();
  if (!session || !session.user || session.user.role !== Role.TEACHER) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const body = await request.json();
  const parsed = parseStandardLessonPayload(body);
  if (!parsed.ok) {
    return new NextResponse(JSON.stringify({ error: parsed.error }), { status: 400 });
  }

  const {
    title,
    price,
    difficulty,
    lesson_preview,
    assignmentText,
    questions,
    contextText,
    assignment_image_url,
    soundcloud_url,
    attachment_url,
    notes,
    assignmentNotification,
    scheduledAssignmentDate,
    isFreeForAll,
  } = parsed.data;

  try {
    const newLesson = await prisma.lesson.create({
      data: {
        title: title,
        price: price,
        lesson_preview,
        assignment_text: assignmentText,
        questions,
        context_text: contextText,
        assignment_image_url: assignment_image_url,
        soundcloud_url,
        attachment_url,
        notes,
        difficulty,
        assignment_notification: assignmentNotification,
        scheduled_assignment_date: scheduledAssignmentDate,
        teacherId: session.user.id,
        isFreeForAll: Boolean(isFreeForAll),
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
    console.error("Error creating lesson:", error);
    return new NextResponse(
      JSON.stringify({ error: "Failed to create lesson" }),
      { status: 500 }
    );
  }
}
