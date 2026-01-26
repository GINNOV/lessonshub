// file: src/app/api/lessons/news-article/[lessonId]/route.ts
import { auth } from '@/auth';
import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { AssignmentNotification, LessonType, Role } from '@prisma/client';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const session = await auth();
  const { lessonId } = await params;

  if (!session?.user?.id || session.user.role !== Role.TEACHER) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const body = await request.json();
  const {
    title,
    lesson_preview,
    assignment_text,
    notes,
    price,
    difficulty,
    assignment_notification,
    scheduled_assignment_date,
    isFreeForAll,
    assignment_image_url,
    markdown,
    maxWordTaps,
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
      { status: 400 }
    );
  }

  if (!title || !lesson_preview || !markdown) {
    return new NextResponse(
      JSON.stringify({ error: 'Title, preview, and article markdown are required.' }),
      { status: 400 }
    );
  }

  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, teacherId: session.user.id },
  });

  if (!lesson) {
    return new NextResponse(
      JSON.stringify({ error: "Lesson not found or you don't have permission to edit it." }),
      { status: 404 }
    );
  }

  const difficultyValue = Number(difficulty);
  if (!Number.isInteger(difficultyValue) || difficultyValue < 1 || difficultyValue > 5) {
    return new NextResponse(
      JSON.stringify({ error: 'Difficulty must be an integer between 1 and 5.' }),
      { status: 400 }
    );
  }

  const parsedMax = Number(maxWordTaps);
  const normalizedMax =
    Number.isFinite(parsedMax) && parsedMax > 0 ? Math.floor(parsedMax) : null;

  try {
    const updatedLesson = await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        title,
        price,
        type: LessonType.NEWS_ARTICLE,
        lesson_preview,
        assignment_text,
        notes,
        assignment_image_url,
        difficulty: difficultyValue,
        assignment_notification: assignmentNotification,
        scheduled_assignment_date: scheduledAssignmentDate,
        isFreeForAll: Boolean(isFreeForAll),
        newsArticleConfig: {
          upsert: {
            create: {
              markdown,
              maxWordTaps: normalizedMax,
            },
            update: {
              markdown,
              maxWordTaps: normalizedMax,
            },
          },
        },
      },
    });

    return NextResponse.json(updatedLesson, { status: 200 });
  } catch (error) {
    console.error('NEWS_ARTICLE_LESSON_UPDATE_ERROR', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to update news article lesson.' }), {
      status: 500,
    });
  }
}
