// file: src/app/api/lessons/composer/[lessonId]/route.ts
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { AssignmentNotification, LessonType, Role } from '@prisma/client';
import { normalizeComposerWord, parseComposerSentence } from '@/lib/composer';
import { randomUUID } from 'node:crypto';

type ComposerQuestionPayload = { id?: string; prompt: string; answer: string; maxTries?: number | null };

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ lessonId: string }> },
) {
  const session = await auth();
  if (!session || !session.user || session.user.role !== Role.TEACHER) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { lessonId } = await params;
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
    price,
    difficulty,
    assignment_notification,
    scheduled_assignment_date,
    isFreeForAll,
    hiddenSentence,
    questions,
    maxTries,
  } = body;

  const assignmentNotification = assignment_notification ?? AssignmentNotification.NOT_ASSIGNED;
  const rawScheduledAssignmentDate = scheduled_assignment_date
    ? new Date(scheduled_assignment_date)
    : null;
  const scheduledAssignmentDate =
    rawScheduledAssignmentDate && !Number.isNaN(rawScheduledAssignmentDate.getTime())
      ? rawScheduledAssignmentDate
      : null;

  if (
    assignmentNotification === AssignmentNotification.ASSIGN_ON_DATE &&
    (!scheduledAssignmentDate || Number.isNaN(scheduledAssignmentDate.getTime()))
  ) {
    return new NextResponse(
      JSON.stringify({ error: 'A valid scheduled assignment date is required.' }),
      { status: 400 },
    );
  }

  if (!title || !lesson_preview || !hiddenSentence) {
    return new NextResponse(
      JSON.stringify({ error: 'Title, lesson preview, and hidden sentence are required.' }),
      { status: 400 },
    );
  }

  const difficultyValue = Number(difficulty);
  if (!Number.isInteger(difficultyValue) || difficultyValue < 1 || difficultyValue > 5) {
    return new NextResponse(
      JSON.stringify({ error: 'Difficulty must be an integer between 1 and 5.' }),
      { status: 400 },
    );
  }

  const { words } = parseComposerSentence(hiddenSentence);
  if (words.length === 0) {
    return new NextResponse(
      JSON.stringify({ error: 'Hidden sentence must contain at least one word.' }),
      { status: 400 },
    );
  }
  const normalizedWords = words.map((word) => normalizeComposerWord(word));
  const questionPayloads = Array.isArray(questions) ? questions : [];
  const questionBank: Array<{ id: string; prompt: string; answer: string; maxTries?: number | null }> = [];
  for (const [index, question] of questionPayloads.entries()) {
    const prompt = String((question as ComposerQuestionPayload)?.prompt ?? '').trim();
    const answer = String((question as ComposerQuestionPayload)?.answer ?? '').trim();
    const rawMaxTries = (question as ComposerQuestionPayload)?.maxTries;
    let maxTriesValue: number | null = null;
    if (rawMaxTries !== null && rawMaxTries !== undefined) {
      const parsedMaxTries = Number(rawMaxTries);
      if (!Number.isInteger(parsedMaxTries) || parsedMaxTries < 1) {
        return new NextResponse(
          JSON.stringify({ error: `Question ${index + 1} max tries must be a whole number greater than 0.` }),
          { status: 400 },
        );
      }
      maxTriesValue = parsedMaxTries;
    }
    if (prompt && answer) {
      questionBank.push({
        id: (question as ComposerQuestionPayload)?.id || randomUUID(),
        prompt,
        answer,
        maxTries: maxTriesValue,
      });
    }
  }

  if (questionBank.length === 0) {
    return new NextResponse(
      JSON.stringify({ error: 'Provide at least one composer question.' }),
      { status: 400 },
    );
  }

  const questionMap = new Map<string, number>();
  questionBank.forEach((question) => {
    const key = normalizeComposerWord(question.answer);
    questionMap.set(key, (questionMap.get(key) ?? 0) + 1);
  });
  const missing = normalizedWords.filter((word) => !questionMap.has(word));
  if (missing.length > 0) {
    return new NextResponse(
      JSON.stringify({ error: `Add at least one question for: ${[...new Set(missing)].join(', ')}.` }),
      { status: 400 },
    );
  }
  const maxTriesValue = Number.isFinite(Number(maxTries)) ? Number(maxTries) : 1;
  if (!Number.isInteger(maxTriesValue) || maxTriesValue < 1) {
    return new NextResponse(
      JSON.stringify({ error: 'Max tries must be a whole number greater than 0.' }),
      { status: 400 },
    );
  }

  try {
    const existing = await prisma.lesson.findFirst({
      where: { id: lessonId, teacherId: session.user.id, type: LessonType.COMPOSER },
      select: { id: true },
    });
    if (!existing) {
      return new NextResponse(JSON.stringify({ error: 'Lesson not found.' }), { status: 404 });
    }

    const updatedLesson = await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        title,
        price,
        lesson_preview,
        assignment_text,
        context_text,
        assignment_image_url,
        soundcloud_url,
        attachment_url,
        notes,
        difficulty: difficultyValue,
        assignment_notification: assignmentNotification,
        scheduled_assignment_date: scheduledAssignmentDate,
        isFreeForAll: Boolean(isFreeForAll),
        composerConfig: {
          upsert: {
            create: {
              hiddenSentence,
              questionBank,
              maxTries: maxTriesValue,
            },
            update: {
              hiddenSentence,
              questionBank,
              maxTries: maxTriesValue,
            },
          },
        },
      },
    });

    return NextResponse.json(updatedLesson, { status: 200 });
  } catch (error) {
    console.error('COMPOSER_LESSON_UPDATE_ERROR', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to update composer lesson.' }), {
      status: 500,
    });
  }
}
