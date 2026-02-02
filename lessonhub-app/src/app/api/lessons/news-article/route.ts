// file: src/app/api/lessons/news-article/route.ts
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { AssignmentNotification, LessonType, Role } from '@prisma/client';
import { autoAssignLessonToAllStudents } from '@/lib/lessonAssignments';

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
    notes,
    price,
    difficulty,
    assignment_notification,
    scheduled_assignment_date,
    isFreeForAll,
    assignment_image_url,
    attachment_url,
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
    const newLesson = await prisma.lesson.create({
      data: {
        title,
        price,
        lesson_preview,
        assignment_text,
        notes,
        difficulty: difficultyValue,
        type: LessonType.NEWS_ARTICLE,
        assignment_notification: assignmentNotification,
        scheduled_assignment_date: scheduledAssignmentDate,
        teacherId: session.user.id,
        isFreeForAll: Boolean(isFreeForAll),
        assignment_image_url,
        attachment_url,
        newsArticleConfig: {
          create: {
            markdown,
            maxWordTaps: normalizedMax,
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
    console.error('NEWS_ARTICLE_LESSON_CREATE_ERROR', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to create news article lesson.' }), {
      status: 500,
    });
  }
}
