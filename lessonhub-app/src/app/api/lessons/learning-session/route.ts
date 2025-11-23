// file: src/app/api/lessons/learning-session/route.ts
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { AssignmentNotification, LessonType, Role } from "@prisma/client";
import { autoAssignLessonToAllStudents } from "@/lib/lessonAssignments";

type CardPayload = {
  content1?: string;
  content2?: string;
  content3?: string;
  content4?: string;
  extra?: string;
};

const normalizePrice = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const normalizeCards = (cards: unknown): Array<Required<CardPayload> & { orderIndex: number }> => {
  if (!Array.isArray(cards)) {
    return [];
  }

  const normalized = cards
    .map((card, index) => {
      if (!card || typeof card !== 'object') return null;
      const {
        content1 = '',
        content2 = '',
        content3 = '',
        content4 = '',
        extra = '',
      } = card as CardPayload;

      const trimmed = {
        content1: content1?.toString().trim() ?? '',
        content2: content2?.toString().trim() ?? '',
        content3: content3?.toString().trim() || null,
        content4: content4?.toString().trim() || null,
        extra: extra?.toString().trim() || null,
      };

      if (!trimmed.content1 && !trimmed.content2 && !trimmed.content3 && !trimmed.content4) {
        return null;
      }

      if (!trimmed.content1 || !trimmed.content2) {
        return null;
      }

      return {
        orderIndex: index,
        content1: trimmed.content1,
        content2: trimmed.content2,
        content3: trimmed.content3,
        content4: trimmed.content4,
        extra: trimmed.extra,
      };
    })
    .filter((card): card is Required<CardPayload> & { orderIndex: number } => card !== null);

  return normalized;
};

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.TEACHER) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const body = await request.json();
  const {
    title,
    price,
    lesson_preview,
    assignment_text,
    difficulty,
    cards,
    guideCardImage,
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

  if (!title || typeof title !== 'string') {
    return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
  }

  const normalizedCards = normalizeCards(cards);
  if (normalizedCards.length === 0) {
    return NextResponse.json({ error: 'At least one guide card is required.' }, { status: 400 });
  }
  const normalizedImage =
    typeof guideCardImage === 'string' && guideCardImage.trim()
      ? guideCardImage.trim()
      : '/my-guides/defaultcard.png';

  const difficultyValue = Number(difficulty);
  if (!Number.isInteger(difficultyValue) || difficultyValue < 1 || difficultyValue > 5) {
    return NextResponse.json({ error: 'Difficulty must be an integer between 1 and 5.' }, { status: 400 });
  }

  if (
    assignmentNotification === AssignmentNotification.ASSIGN_ON_DATE &&
    (!scheduledAssignmentDate || Number.isNaN(scheduledAssignmentDate.getTime()))
  ) {
    return NextResponse.json(
      { error: 'A valid scheduled assignment date is required.' },
      { status: 400 }
    );
  }

  try {
    const lesson = await prisma.lesson.create({
      data: {
        title: title.trim(),
        price: normalizePrice(price),
        lesson_preview,
        assignment_text,
        difficulty: difficultyValue,
        assignment_notification: assignmentNotification,
        scheduled_assignment_date: scheduledAssignmentDate,
        type: LessonType.LEARNING_SESSION,
        teacherId: session.user.id,
        guideCardImage: normalizedImage,
        learningSessionCards: {
          create: normalizedCards,
        },
      },
      include: {
        learningSessionCards: true,
      },
    });

    await autoAssignLessonToAllStudents({
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      assignmentNotification,
      scheduledAssignmentDate,
      teacherName: session.user.name,
    });
    return NextResponse.json(lesson, { status: 201 });
  } catch (error) {
    console.error('LEARNING_SESSION_CREATE_ERROR', error);
    return NextResponse.json({ error: 'Failed to create guide.' }, { status: 500 });
  }
}
