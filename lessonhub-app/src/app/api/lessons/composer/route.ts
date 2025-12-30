// file: src/app/api/lessons/composer/route.ts
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { AssignmentNotification, LessonType, Role } from '@prisma/client';
import { autoAssignLessonToAllStudents } from '@/lib/lessonAssignments';
import { normalizeComposerWord, parseComposerSentence } from '@/lib/composer';
import { randomUUID } from 'node:crypto';

type ComposerQuestionPayload = { id?: string; prompt: string; answer: string };

export async function POST(request: Request) {
  const session = await auth();
  if (!session || !session.user || session.user.role !== Role.TEACHER) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
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
  const questionBank = (Array.isArray(questions) ? questions : [])
    .map((question: ComposerQuestionPayload) => ({
      id: question.id || randomUUID(),
      prompt: String(question.prompt ?? '').trim(),
      answer: String(question.answer ?? '').trim(),
    }))
    .filter((question) => question.prompt && question.answer);

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
    const newLesson = await prisma.lesson.create({
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
        type: LessonType.COMPOSER,
        assignment_notification: assignmentNotification,
        scheduled_assignment_date: scheduledAssignmentDate,
        teacherId: session.user.id,
        isFreeForAll: Boolean(isFreeForAll),
        composerConfig: {
          create: {
            hiddenSentence,
            questionBank,
            maxTries: maxTriesValue,
          },
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
    console.error('COMPOSER_LESSON_CREATE_ERROR', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to create composer lesson.' }), {
      status: 500,
    });
  }
}
