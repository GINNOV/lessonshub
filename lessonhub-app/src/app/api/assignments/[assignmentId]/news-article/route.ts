// file: src/app/api/assignments/[assignmentId]/news-article/route.ts
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { LessonType, PointReason, Role } from '@prisma/client';
import {
  NEWS_ARTICLE_BASE_EUROS,
  NEWS_ARTICLE_BASE_POINTS,
  NEWS_ARTICLE_REPEAT_EUROS,
  NEWS_ARTICLE_REPEAT_POINTS,
  formatNewsArticleTapNote,
  normalizeNewsArticleWord,
} from '@/lib/newsArticle';
import { validateAssignmentForSubmission } from '@/lib/assignmentValidation';

class TapLimitReachedError extends Error {
  tapCount: number

  constructor(tapCount: number) {
    super('Tap limit reached.')
    this.name = 'TapLimitReachedError'
    this.tapCount = tapCount
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ assignmentId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== Role.STUDENT) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { assignmentId } = await params;
  const body = await request.json().catch(() => ({}));
  const wordRaw = typeof body?.word === 'string' ? body.word.trim() : '';
  const normalizedWord = normalizeNewsArticleWord(wordRaw);
  const tapNote = formatNewsArticleTapNote(normalizedWord);

  if (!tapNote) {
    return new NextResponse(JSON.stringify({ error: 'Invalid word tap.' }), { status: 400 });
  }

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

  const validation = validateAssignmentForSubmission({
    status: assignment.status,
    deadline: assignment.deadline,
  });
  if (!validation.ok) {
    return new NextResponse(
      JSON.stringify({ error: validation.error }),
      { status: validation.reason === 'deadline' ? 403 : 400 }
    );
  }

  const maxWordTaps = assignment.lesson.newsArticleConfig.maxWordTaps ?? null;
  const hasTapLimit = typeof maxWordTaps === 'number' && maxWordTaps > 0

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.pointTransaction.findFirst({
        where: {
          assignmentId,
          reason: PointReason.NEWS_ARTICLE_TAP,
          note: {
            equals: tapNote,
            mode: 'insensitive',
          },
        },
        select: { id: true },
      });

      const isRepeatTap = Boolean(existing);
      const pointsDelta = isRepeatTap ? NEWS_ARTICLE_REPEAT_POINTS : NEWS_ARTICLE_BASE_POINTS;
      const eurosDelta = isRepeatTap ? NEWS_ARTICLE_REPEAT_EUROS : NEWS_ARTICLE_BASE_EUROS;
      let tapCount: number;

      if (hasTapLimit) {
        const updatedAssignment = await tx.assignment.updateMany({
          where: {
            id: assignmentId,
            newsArticleTapCount: { lt: maxWordTaps },
          },
          data: { newsArticleTapCount: { increment: 1 } },
        });

        if (updatedAssignment.count === 0) {
          const latestAssignment = await tx.assignment.findUnique({
            where: { id: assignmentId },
            select: { newsArticleTapCount: true },
          });
          throw new TapLimitReachedError(latestAssignment?.newsArticleTapCount ?? maxWordTaps)
        }

        const latestAssignment = await tx.assignment.findUnique({
          where: { id: assignmentId },
          select: { newsArticleTapCount: true },
        });
        tapCount = latestAssignment?.newsArticleTapCount ?? maxWordTaps
      } else {
        const updatedAssignment = await tx.assignment.update({
          where: { id: assignmentId },
          data: { newsArticleTapCount: { increment: 1 } },
          select: { newsArticleTapCount: true },
        });
        tapCount = updatedAssignment.newsArticleTapCount
      }

      const updatedUser = await tx.user.update({
        where: { id: session.user.id },
        data: { totalPoints: { increment: pointsDelta } },
        select: { totalPoints: true },
      });

      await tx.pointTransaction.create({
        data: {
          userId: session.user.id,
          assignmentId,
          points: pointsDelta,
          amountEuro: eurosDelta,
          reason: PointReason.NEWS_ARTICLE_TAP,
          note: tapNote,
        },
      });

      return {
        tapCount,
        totalPoints: updatedUser.totalPoints,
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
    if (error instanceof TapLimitReachedError) {
      return new NextResponse(JSON.stringify({ error: error.message, tapCount: error.tapCount }), {
        status: 400,
      });
    }
    console.error('NEWS_ARTICLE_TAP_ERROR', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to record word tap.' }), {
      status: 500,
    });
  }
}
