// file: src/app/api/assignments/[assignmentId]/news-article/route.ts
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { LessonType, PointReason } from '@prisma/client';
import {
  NEWS_ARTICLE_BASE_EUROS,
  NEWS_ARTICLE_BASE_POINTS,
  NEWS_ARTICLE_REPEAT_EUROS,
  NEWS_ARTICLE_REPEAT_POINTS,
  normalizeNewsArticleWord,
} from '@/lib/newsArticle';

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
  const wordRaw = typeof body?.word === 'string' ? body.word.trim() : '';
  const normalizedWord = normalizeNewsArticleWord(wordRaw);
  const hasWord = Boolean(normalizedWord);

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

      let isRepeatTap = false;
      if (hasWord) {
        const existing = await tx.pointTransaction.findFirst({
          where: {
            assignmentId,
            reason: PointReason.NEWS_ARTICLE_TAP,
            note: {
              contains: `News Article tap: ${normalizedWord}`,
              mode: 'insensitive',
            },
          },
          select: { id: true },
        });
        isRepeatTap = Boolean(existing);
      }

      const pointsDelta = isRepeatTap ? NEWS_ARTICLE_REPEAT_POINTS : NEWS_ARTICLE_BASE_POINTS;
      const eurosDelta = isRepeatTap ? NEWS_ARTICLE_REPEAT_EUROS : NEWS_ARTICLE_BASE_EUROS;

      const currentPoints = user?.totalPoints ?? 0;
      const nextPoints = currentPoints + pointsDelta;

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
          points: pointsDelta,
          amountEuro: eurosDelta,
          reason: PointReason.NEWS_ARTICLE_TAP,
          note: hasWord ? `News Article tap: ${normalizedWord}` : 'News Article tap',
        },
      });

      return {
        tapCount: updatedAssignment.newsArticleTapCount,
        totalPoints: nextPoints,
        pointsDelta,
        eurosDelta,
      };
    });

    return NextResponse.json(
      {
        tapCount: result.tapCount,
        pointsDelta: result.pointsDelta,
        eurosDelta: result.eurosDelta,
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
