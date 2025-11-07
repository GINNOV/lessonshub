// file: src/app/api/lessons/learning-session/[lessonId]/route.ts
export const runtime = 'nodejs';

import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { LessonType, Role } from "@prisma/client";

type CardPayload = {
  content1?: string;
  content2?: string;
  content3?: string;
  content4?: string;
  extra?: string;
};

const normalizeCards = (cards: unknown): Array<Required<CardPayload> & { orderIndex: number }> => {
  if (!Array.isArray(cards)) return [];

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

      if (!trimmed.content1 || !trimmed.content2) {
        return null;
      }

      return {
        orderIndex: index,
        ...trimmed,
      };
    })
    .filter((card): card is Required<CardPayload> & { orderIndex: number } => card !== null);

  return normalized;
};

const normalizePrice = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const session = await auth();
  const { lessonId } = await params;

  if (!session?.user || session.user.role !== Role.TEACHER) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, teacherId: session.user.id },
    select: { id: true },
  });

  if (!lesson) {
    return NextResponse.json({ error: 'Lesson not found.' }, { status: 404 });
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
  } = body;

  if (!title || typeof title !== 'string') {
    return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
  }

  const normalizedCards = normalizeCards(cards);
  if (normalizedCards.length === 0) {
    return NextResponse.json({ error: 'At least one learning session card is required.' }, { status: 400 });
  }
  const normalizedImage =
    typeof guideCardImage === 'string' && guideCardImage.trim()
      ? guideCardImage.trim()
      : '/my-guides/defaultcard.png';

  const difficultyValue = Number(difficulty);
  if (!Number.isInteger(difficultyValue) || difficultyValue < 1 || difficultyValue > 5) {
    return NextResponse.json({ error: 'Difficulty must be an integer between 1 and 5.' }, { status: 400 });
  }

  try {
    const [, updatedLesson] = await prisma.$transaction([
      prisma.learningSessionCard.deleteMany({ where: { lessonId } }),
      prisma.lesson.update({
        where: { id: lessonId },
        data: {
          title: title.trim(),
          price: normalizePrice(price),
          lesson_preview,
          assignment_text,
          difficulty: difficultyValue,
          type: LessonType.LEARNING_SESSION,
          guideCardImage: normalizedImage,
          learningSessionCards: {
            create: normalizedCards,
          },
        },
        include: {
          learningSessionCards: true,
        },
      }),
    ]);

    return NextResponse.json(updatedLesson, { status: 200 });
  } catch (error) {
    console.error('LEARNING_SESSION_UPDATE_ERROR', error);
    return NextResponse.json({ error: 'Failed to update learning session.' }, { status: 500 });
  }
}
