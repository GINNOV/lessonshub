// file: src/app/api/lessons/arkaning/[lessonId]/route.ts
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { AssignmentNotification, LessonType, Role } from '@prisma/client';
import { randomUUID } from 'node:crypto';

type ArkaningQuestionPayload = {
  id?: string;
  prompt: string;
  answer: string;
  reveal: string;
};

const normalizeAnswer = (value: string) => {
  const raw = value.trim().toLowerCase();
  if (raw === 'ing' || raw === '-ing') return 'ing';
  if (raw === 'not-ing' || raw === 'not ing') return 'not-ing';
  return null;
};

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
    questions,
    roundsPerCorrect,
    pointsPerCorrect,
    eurosPerCorrect,
    lives,
    loseLifeOnWrong,
    wrongsPerLife,
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

  if (!title || !lesson_preview) {
    return new NextResponse(
      JSON.stringify({ error: 'Title and lesson preview are required.' }),
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

  const roundsValue = Number(roundsPerCorrect);
  if (!Number.isInteger(roundsValue) || roundsValue < 1) {
    return new NextResponse(
      JSON.stringify({ error: 'Rounds per correct must be a whole number greater than 0.' }),
      { status: 400 },
    );
  }
  const pointsValue = Number(pointsPerCorrect);
  if (!Number.isInteger(pointsValue) || pointsValue < 0) {
    return new NextResponse(
      JSON.stringify({ error: 'Points per correct must be 0 or greater.' }),
      { status: 400 },
    );
  }
  const eurosValue = Number(eurosPerCorrect);
  if (!Number.isFinite(eurosValue) || eurosValue < 0) {
    return new NextResponse(
      JSON.stringify({ error: 'Euros per correct must be 0 or greater.' }),
      { status: 400 },
    );
  }
  const livesValue = Number(lives);
  if (!Number.isInteger(livesValue) || livesValue < 1) {
    return new NextResponse(
      JSON.stringify({ error: 'Lives must be a whole number greater than 0.' }),
      { status: 400 },
    );
  }
  const loseLifeOnWrongValue = Boolean(loseLifeOnWrong ?? true);
  const wrongsPerLifeValue = Number(wrongsPerLife);
  if (!loseLifeOnWrongValue && (!Number.isInteger(wrongsPerLifeValue) || wrongsPerLifeValue < 1)) {
    return new NextResponse(
      JSON.stringify({ error: 'Wrongs per life must be a whole number greater than 0.' }),
      { status: 400 },
    );
  }

  const questionPayloads = Array.isArray(questions) ? questions : [];
  const questionBank: Array<{ id: string; prompt: string; answer: string; reveal: string }> = [];
  for (const [index, question] of questionPayloads.entries()) {
    const prompt = String((question as ArkaningQuestionPayload)?.prompt ?? '').trim();
    const reveal = String((question as ArkaningQuestionPayload)?.reveal ?? '').trim();
    const rawAnswer = String((question as ArkaningQuestionPayload)?.answer ?? '').trim();
    const normalizedAnswer = normalizeAnswer(rawAnswer);
    if (!prompt || !reveal || !normalizedAnswer) {
      return new NextResponse(
        JSON.stringify({ error: `Question ${index + 1} must include prompt, answer, and reveal.` }),
        { status: 400 },
      );
    }
    questionBank.push({
      id: (question as ArkaningQuestionPayload)?.id || randomUUID(),
      prompt,
      answer: normalizedAnswer,
      reveal,
    });
  }

  if (questionBank.length === 0) {
    return new NextResponse(
      JSON.stringify({ error: 'Provide at least one ArkanING question.' }),
      { status: 400 },
    );
  }

  try {
    const existing = await prisma.lesson.findFirst({
      where: { id: lessonId, teacherId: session.user.id, type: LessonType.ARKANING },
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
        arkaningConfig: {
          upsert: {
            create: {
              questionBank,
              roundsPerCorrect: roundsValue,
              pointsPerCorrect: pointsValue,
              eurosPerCorrect: eurosValue,
              lives: livesValue,
              loseLifeOnWrong: loseLifeOnWrongValue,
              wrongsPerLife: wrongsPerLifeValue || 1,
            },
            update: {
              questionBank,
              roundsPerCorrect: roundsValue,
              pointsPerCorrect: pointsValue,
              eurosPerCorrect: eurosValue,
              lives: livesValue,
              loseLifeOnWrong: loseLifeOnWrongValue,
              wrongsPerLife: wrongsPerLifeValue || 1,
            },
          },
        },
      },
    });

    return NextResponse.json(updatedLesson, { status: 200 });
  } catch (error) {
    console.error('ARKANING_LESSON_UPDATE_ERROR', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to update ArkanING lesson.' }), {
      status: 500,
    });
  }
}
