// file: src/app/api/assignments/[assignmentId]/flipper/route.ts
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { LessonType, PointReason } from '@prisma/client';
import { POINT_TO_EURO_RATE } from '@/lib/points';

const ATTEMPT_REWARDS = [10, 5, 1];
const PENALTY_PER_ATTEMPT = 5;

const getEurosDelta = (attempts: number, threshold: number) => {
  if (attempts <= 0 || !Number.isFinite(attempts)) return 0;
  if (attempts === 1) return ATTEMPT_REWARDS[0];
  if (attempts === 2) return ATTEMPT_REWARDS[1];
  if (attempts <= threshold) return ATTEMPT_REWARDS[2];
  return -PENALTY_PER_ATTEMPT * (attempts - threshold);
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ assignmentId: string }> },
) {
  const session = await auth();
  if (!session || !session.user) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { assignmentId } = await params;
  const body = await request.json().catch(() => ({}));
  const attempts = Number(body?.attempts);
  const word = typeof body?.word === 'string' ? body.word.trim() : '';

  if (!Number.isInteger(attempts) || attempts < 1) {
    return new NextResponse(JSON.stringify({ error: 'Invalid attempt count.' }), { status: 400 });
  }

  const assignment = await prisma.assignment.findFirst({
    where: { id: assignmentId, studentId: session.user.id },
    include: {
      lesson: {
        select: {
          type: true,
          flipperConfig: true,
        },
      },
    },
  });

  if (!assignment || assignment.lesson.type !== LessonType.FLIPPER || !assignment.lesson.flipperConfig) {
    return new NextResponse(JSON.stringify({ error: 'Flipper assignment not found.' }), { status: 404 });
  }

  const threshold = Math.max(3, Number(assignment.lesson.flipperConfig.attemptsBeforePenalty ?? 3));
  const eurosDelta = getEurosDelta(attempts, threshold);
  const pointsDelta = Math.round(eurosDelta / POINT_TO_EURO_RATE);

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: session.user.id },
        select: { totalPoints: true },
      });
      const currentPoints = user?.totalPoints ?? 0;
      const nextPoints = currentPoints + pointsDelta;

      const updatedUser = await tx.user.update({
        where: { id: session.user.id },
        data: { totalPoints: nextPoints },
        select: { totalPoints: true },
      });

      await tx.pointTransaction.create({
        data: {
          userId: session.user.id,
          assignmentId,
          points: pointsDelta,
          amountEuro: eurosDelta,
          reason: PointReason.FLIPPER_MATCH,
          note: word ? `Flipper match: ${word}` : 'Flipper match',
        },
      });

      return updatedUser;
    });

    return NextResponse.json(
      { pointsDelta, eurosDelta, totalPoints: updated.totalPoints },
      { status: 200 },
    );
  } catch (error) {
    console.error('FLIPPER_MATCH_SCORE_ERROR', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to record Flipper match.' }), {
      status: 500,
    });
  }
}
