// file: src/app/api/lessons/flipper/[lessonId]/route.ts
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { AssignmentNotification, LessonType, Role } from '@prisma/client';

const TILE_COUNT = 12;
const MIN_PENALTY_THRESHOLD = 3;

type FlipperTilePayload = {
  imageUrl: string;
  word: string;
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
    const existing = await prisma.lesson.findFirst({
      where: { id: lessonId, teacherId: session.user.id, type: LessonType.FLIPPER },
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
        flipperConfig: {
          upsert: {
            create: {
              attemptsBeforePenalty: attemptsValue,
            },
            update: {
              attemptsBeforePenalty: attemptsValue,
            },
          },
        },
        flipperTiles: {
          deleteMany: {},
          create: sanitizedTiles.map((tile) => ({
            imageUrl: tile.imageUrl,
            word: tile.word,
          })),
        },
      },
    });

    return NextResponse.json(updatedLesson, { status: 200 });
  } catch (error) {
    console.error('FLIPPER_LESSON_UPDATE_ERROR', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to update Flipper lesson.' }), {
      status: 500,
    });
  }
}
