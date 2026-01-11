import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

function formatDate(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function formatDecimal(value: { toNumber: () => number } | null | undefined) {
  return value ? value.toNumber() : null;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      timeZone: true,
      weeklySummaryOptOut: true,
      gender: true,
      role: true,
      lastSeen: true,
      isPaying: true,
      isSuspended: true,
      isTakingBreak: true,
      totalPoints: true,
      defaultLessonPrice: true,
      defaultLessonPreview: true,
      defaultLessonNotes: true,
      defaultLessonInstructions: true,
      teacherBio: true,
      studentBio: true,
      progressCardTitle: true,
      progressCardBody: true,
      progressCardLinkText: true,
      progressCardLinkUrl: true,
      assignmentSummaryFooter: true,
      referralCode: true,
      referrerId: true,
      uiLanguage: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const [
    assignments,
    lessons,
    loginEvents,
    pointTransactions,
    badges,
    guideCompletions,
    couponRedemptions,
    lyricLessonAttempts,
    teacherRatingsGiven,
    teacherLinks,
  ] = await Promise.all([
    prisma.assignment.findMany({
      where: { studentId: userId },
      select: {
        id: true,
        assignedAt: true,
        startDate: true,
        deadline: true,
        originalDeadline: true,
        status: true,
        score: true,
        gradedAt: true,
        studentNotes: true,
        rating: true,
        answers: true,
        teacherComments: true,
        pointsAwarded: true,
        extraPoints: true,
        lesson: {
          select: {
            id: true,
            title: true,
            type: true,
          },
        },
      },
    }),
    prisma.lesson.findMany({
      where: { teacherId: userId },
      select: {
        id: true,
        title: true,
        type: true,
        createdAt: true,
        updatedAt: true,
        difficulty: true,
        price: true,
        isFreeForAll: true,
        guideIsVisible: true,
        guideIsFreeForAll: true,
        assignment_notification: true,
        scheduled_assignment_date: true,
      },
    }),
    prisma.loginEvent.findMany({
      where: { userId },
      select: {
        id: true,
        createdAt: true,
        ipAddress: true,
        userAgent: true,
        lessonId: true,
        lesson: { select: { title: true } },
      },
    }),
    prisma.pointTransaction.findMany({
      where: { userId },
      select: {
        id: true,
        points: true,
        reason: true,
        note: true,
        createdAt: true,
        assignmentId: true,
      },
    }),
    prisma.userBadge.findMany({
      where: { userId },
      select: {
        id: true,
        awardedAt: true,
        metadata: true,
        assignmentId: true,
        badge: {
          select: {
            slug: true,
            name: true,
            description: true,
            category: true,
          },
        },
      },
    }),
    prisma.guideCompletion.findMany({
      where: { studentId: userId },
      select: {
        id: true,
        completedAt: true,
        guide: { select: { id: true, title: true } },
      },
    }),
    prisma.couponRedemption.findMany({
      where: { userId },
      select: {
        id: true,
        createdAt: true,
        coupon: { select: { code: true, description: true } },
      },
    }),
    prisma.lyricLessonAttempt.findMany({
      where: { studentId: userId },
      select: {
        id: true,
        createdAt: true,
        scorePercent: true,
        timeTakenSeconds: true,
        answers: true,
        lesson: { select: { id: true, title: true } },
      },
    }),
    prisma.teacherRating.findMany({
      where: { studentId: userId },
      select: {
        id: true,
        createdAt: true,
        teacherId: true,
        contentQuality: true,
        helpfulness: true,
        communication: true,
        valueForMoney: true,
        overall: true,
        comments: true,
      },
    }),
    prisma.teachersForStudent.findMany({
      where: { studentId: userId },
      select: {
        teacher: { select: { id: true, name: true } },
        classId: true,
      },
    }),
  ]);

  const payload = {
    generatedAt: new Date().toISOString(),
    user: {
      ...user,
      lastSeen: formatDate(user.lastSeen),
      defaultLessonPrice: formatDecimal(user.defaultLessonPrice),
    },
    assignments: assignments.map((assignment) => ({
      ...assignment,
      assignedAt: assignment.assignedAt.toISOString(),
      startDate: assignment.startDate.toISOString(),
      deadline: assignment.deadline.toISOString(),
      originalDeadline: formatDate(assignment.originalDeadline),
      gradedAt: formatDate(assignment.gradedAt),
    })),
    lessons: lessons.map((lesson) => ({
      ...lesson,
      createdAt: lesson.createdAt.toISOString(),
      updatedAt: lesson.updatedAt.toISOString(),
      price: formatDecimal(lesson.price),
      scheduled_assignment_date: formatDate(lesson.scheduled_assignment_date),
    })),
    loginEvents: loginEvents.map((event) => ({
      ...event,
      createdAt: event.createdAt.toISOString(),
    })),
    pointTransactions: pointTransactions.map((transaction) => ({
      ...transaction,
      createdAt: transaction.createdAt.toISOString(),
    })),
    badges: badges.map((badge) => ({
      ...badge,
      awardedAt: badge.awardedAt.toISOString(),
    })),
    guideCompletions: guideCompletions.map((completion) => ({
      ...completion,
      completedAt: completion.completedAt.toISOString(),
    })),
    couponRedemptions: couponRedemptions.map((redemption) => ({
      ...redemption,
      createdAt: redemption.createdAt.toISOString(),
    })),
    lyricLessonAttempts: lyricLessonAttempts.map((attempt) => ({
      ...attempt,
      createdAt: attempt.createdAt.toISOString(),
      scorePercent: formatDecimal(attempt.scorePercent),
    })),
    teacherRatingsGiven: teacherRatingsGiven.map((rating) => ({
      ...rating,
      createdAt: rating.createdAt.toISOString(),
    })),
    assignedTeachers: teacherLinks.map((link) => ({
      teacher: link.teacher,
      classId: link.classId,
    })),
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": "attachment; filename=lessonhub-data-export.json",
    },
  });
}
