'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { AssignmentStatus, PointReason, Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { getStudentStats } from '@/actions/lessonActions';
import { Prisma } from '@prisma/client';

const MARKETPLACE_FOREVER_DEADLINE = new Date('2099-12-31T23:59:59.000Z');

export async function purchaseMarketplaceLesson(assignmentId: string) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== Role.STUDENT) {
    return { success: false, error: 'Unauthorized.' };
  }

  if (!assignmentId) {
    return { success: false, error: 'Missing assignment.' };
  }

  const assignment = await prisma.assignment.findFirst({
    where: { id: assignmentId, studentId: session.user.id },
    select: {
      id: true,
      status: true,
      deadline: true,
      lesson: {
        select: {
          title: true,
          price: true,
        },
      },
    },
  });

  if (!assignment) {
    return { success: false, error: 'Assignment not found.' };
  }

  const now = new Date();
  const isPastDuePending =
    assignment.status === AssignmentStatus.PENDING &&
    new Date(assignment.deadline).getTime() <= now.getTime();
  const isFailed = assignment.status === AssignmentStatus.FAILED;

  if (!isPastDuePending && !isFailed) {
    return {
      success: false,
      error: 'Only failed or past-due lessons are available in the marketplace.',
    };
  }

  const existingPurchase = await prisma.pointTransaction.findFirst({
    where: {
      assignmentId: assignment.id,
      userId: session.user.id,
      reason: PointReason.MARKETPLACE_PURCHASE,
    },
    select: { id: true },
  });

  if (existingPurchase) {
    return { success: false, error: 'This lesson was already purchased.' };
  }

  const lessonPrice = assignment.lesson.price?.toNumber?.() ?? Number(assignment.lesson.price ?? 0);
  const { totalValue } = await getStudentStats(session.user.id);
  const availableSavings = Math.max(0, totalValue);

  if (lessonPrice > availableSavings) {
    return {
      success: false,
      error: 'Not enough savings to purchase this lesson.',
    };
  }

  try {
    await prisma.$transaction([
      prisma.pointTransaction.create({
        data: {
          userId: session.user.id,
          assignmentId: assignment.id,
          points: 0,
          amountEuro: new Prisma.Decimal(-lessonPrice),
          reason: PointReason.MARKETPLACE_PURCHASE,
          note: `Marketplace purchase: ${assignment.lesson.title}`,
        },
      }),
      prisma.assignment.update({
        where: { id: assignment.id },
        data: {
          status: AssignmentStatus.PENDING,
          deadline: MARKETPLACE_FOREVER_DEADLINE,
          score: null,
          gradedAt: null,
          teacherComments: null,
          answers: Prisma.JsonNull,
          draftAnswers: Prisma.JsonNull,
          draftStudentNotes: null,
          draftRating: null,
          draftUpdatedAt: null,
          studentNotes: null,
          rating: null,
          pointsAwarded: 0,
          extraPoints: 0,
          reminderSentAt: null,
          pastDueWarningSentAt: null,
          gradedByTeacher: false,
        },
      }),
    ]);
  } catch (error) {
    console.error('Failed to purchase marketplace lesson', error);
    return { success: false, error: 'Unable to complete purchase.' };
  }

  revalidatePath('/my-lessons');
  revalidatePath('/marketplace');

  return { success: true };
}
