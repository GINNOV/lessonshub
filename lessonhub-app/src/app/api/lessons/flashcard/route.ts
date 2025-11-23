// file: src/app/api/lessons/flashcard/route.ts
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Role, LessonType, AssignmentNotification } from "@prisma/client";
import { autoAssignLessonToAllStudents } from "@/lib/lessonAssignments";

export async function POST(request: Request) {
  const session = await auth();
  if (!session || !session.user || session.user.role !== Role.TEACHER) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const body = await request.json();
  const {
    title,
    lesson_preview,
    assignment_text,
    context_text,
    attachment_url,
    assignment_image_url,
    soundcloud_url,
    notes,
    flashcards,
    price,
    difficulty,
    assignment_notification,
    scheduled_assignment_date,
  } = body;
  const assignmentNotification = assignment_notification ?? AssignmentNotification.NOT_ASSIGNED;
  const rawScheduledAssignmentDate = scheduled_assignment_date
    ? new Date(scheduled_assignment_date)
    : null;
  const scheduledAssignmentDate =
    rawScheduledAssignmentDate && !Number.isNaN(rawScheduledAssignmentDate.getTime())
      ? rawScheduledAssignmentDate
      : null;

  if (!title || !flashcards || flashcards.length === 0) {
    return new NextResponse(
      JSON.stringify({ error: "Title and at least one flashcard are required" }),
      { status: 400 }
    );
  }

  if (
    assignmentNotification === AssignmentNotification.ASSIGN_ON_DATE &&
    (!scheduledAssignmentDate || Number.isNaN(scheduledAssignmentDate.getTime()))
  ) {
    return new NextResponse(
      JSON.stringify({ error: "A valid scheduled assignment date is required." }),
      { status: 400 }
    );
  }

  const difficultyValue = Number(difficulty);
  if (!Number.isInteger(difficultyValue) || difficultyValue < 1 || difficultyValue > 5) {
    return new NextResponse(
      JSON.stringify({ error: "Difficulty must be an integer between 1 and 5." }),
      { status: 400 }
    );
  }

  try {
    const newLesson = await prisma.lesson.create({
      data: {
        title: title,
        price: price,
        lesson_preview: lesson_preview,
        assignment_text: assignment_text,
        context_text: context_text,
        assignment_image_url: assignment_image_url,
        soundcloud_url: soundcloud_url,
        attachment_url: attachment_url,
        notes: notes,
        difficulty: difficultyValue,
        type: LessonType.FLASHCARD,
        assignment_notification: assignmentNotification,
        scheduled_assignment_date: scheduledAssignmentDate,
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
    await autoAssignLessonToAllStudents({
      lessonId: newLesson.id,
      lessonTitle: newLesson.title,
      assignmentNotification,
      scheduledAssignmentDate,
      teacherName: session.user.name,
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
