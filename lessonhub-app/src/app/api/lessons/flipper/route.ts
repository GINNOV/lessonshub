// file: src/app/api/lessons/flipper/route.ts
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { AssignmentNotification, LessonType, Role } from '@prisma/client';
import { autoAssignLessonToAllStudents } from '@/lib/lessonAssignments';

const TILE_COUNT = 12;
const MIN_PENALTY_THRESHOLD = 3;

type FlipperTilePayload = {
  imageUrl: string;
  word: string;
};

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
    tiles,
    attemptsBeforePenalty,
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

  const attemptsValue = Number(attemptsBeforePenalty ?? MIN_PENALTY_THRESHOLD);
  if (!Number.isInteger(attemptsValue) || attemptsValue < MIN_PENALTY_THRESHOLD) {
    return new NextResponse(
      JSON.stringify({ error: 'Penalty threshold must be 3 or greater.' }),
      { status: 400 },
    );
  }

  const tilePayloads = Array.isArray(tiles) ? tiles : [];
  if (tilePayloads.length !== TILE_COUNT) {
    return new NextResponse(
      JSON.stringify({ error: `Upload exactly ${TILE_COUNT} tiles.` }),
      { status: 400 },
    );
  }

  const sanitizedTiles: FlipperTilePayload[] = [];
  for (const [index, tile] of tilePayloads.entries()) {
    const imageUrl = String((tile as FlipperTilePayload)?.imageUrl ?? '').trim();
    const word = String((tile as FlipperTilePayload)?.word ?? '').trim();
    if (!imageUrl || !word) {
      return new NextResponse(
        JSON.stringify({ error: `Tile ${index + 1} must include an image and a word.` }),
        { status: 400 },
      );
    }
    sanitizedTiles.push({ imageUrl, word });
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
        type: LessonType.FLIPPER,
        assignment_notification: assignmentNotification,
        scheduled_assignment_date: scheduledAssignmentDate,
        teacherId: session.user.id,
        isFreeForAll: Boolean(isFreeForAll),
        flipperConfig: {
          create: {
            attemptsBeforePenalty: attemptsValue,
          },
        },
        flipperTiles: {
          create: sanitizedTiles.map((tile) => ({
            imageUrl: tile.imageUrl,
            word: tile.word,
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
    console.error('FLIPPER_LESSON_CREATE_ERROR', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to create Flipper lesson.' }), {
      status: 500,
    });
  }
}
