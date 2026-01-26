// file: src/app/api/assignments/[assignmentId]/news-article/route.ts
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { LessonType, PointReason } from '@prisma/client';

const POINTS_PER_TAP = 50;
const EUROS_PER_TAP = 0.5;

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
  const word = typeof body?.word === 'string' ? body.word.trim() : '';

  const assignment = await prisma.assignment.findFirst({
    where: { id: assignmentId, studentId: session.user.id },
    include: {
      lesson: {
        select: {
          type: true,
          newsArticleConfig: true,
        },
      },
    },
  });

  if (!assignment || assignment.lesson.type !== LessonType.NEWS_ARTICLE || !assignment.lesson.newsArticleConfig) {
    return new NextResponse(JSON.stringify({ error: 'News article assignment not found.' }), { status: 404 });
  }

  const maxWordTaps = assignment.lesson.newsArticleConfig.maxWordTaps ?? null;
  if (typeof maxWordTaps === 'number' && maxWordTaps > 0 && assignment.newsArticleTapCount >= maxWordTaps) {
    return new NextResponse(JSON.stringify({ error: 'Tap limit reached.', tapCount: assignment.newsArticleTapCount }), {
      status: 400,
    });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: session.user.id },
        select: { totalPoints: true },
      });
      const currentPoints = user?.totalPoints ?? 0;
      const nextPoints = currentPoints + POINTS_PER_TAP;

      const updatedAssignment = await tx.assignment.update({
        where: { id: assignmentId },
        data: { newsArticleTapCount: { increment: 1 } },
        select: { newsArticleTapCount: true },
      });

      await tx.user.update({
        where: { id: session.user.id },
        data: { totalPoints: nextPoints },
      });

      await tx.pointTransaction.create({
        data: {
          userId: session.user.id,
          assignmentId,
          points: POINTS_PER_TAP,
          amountEuro: EUROS_PER_TAP,
          reason: PointReason.NEWS_ARTICLE_TAP,
          note: word ? `News Article tap: ${word}` : 'News Article tap',
        },
      });

      return {
        tapCount: updatedAssignment.newsArticleTapCount,
        totalPoints: nextPoints,
      };
    });

    return NextResponse.json(
      {
        tapCount: result.tapCount,
        pointsDelta: POINTS_PER_TAP,
        eurosDelta: EUROS_PER_TAP,
        totalPoints: result.totalPoints,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('NEWS_ARTICLE_TAP_ERROR', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to record word tap.' }), {
      status: 500,
    });
  }
}
