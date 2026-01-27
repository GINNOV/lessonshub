// file: src/actions/studentActions.ts
'use server';

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { Role, AssignmentStatus, LessonType, PointReason } from "@prisma/client";
import { createButton } from "@/lib/email-templates";
import { sendEmail } from "@/lib/email-templates.server";
import { getStudentGamificationSnapshot } from "@/lib/gamification";
import { EXTENSION_POINT_COST, isExtendedDeadline } from "@/lib/lessonExtensions";
import { convertExtraPointsToEuro } from "@/lib/points";
import { getComposerExtraTries } from "@/lib/composer";

/**
 * Sends a feedback message from the current student to all teachers.
 */
export async function sendFeedbackToTeachers(feedbackMessage: string) {
  const session = await auth();
  if (!session?.user?.id || !session.user.name) {
    return { success: false, error: "Unauthorized" };
  }

  if (!feedbackMessage.trim()) {
      return { success: false, error: "Feedback message cannot be empty." };
  }

  try {
    const teachers = await prisma.user.findMany({
      where: { role: Role.TEACHER },
    });

    if (teachers.length === 0) {
        return { success: false, error: "No teachers found to send feedback to." };
    }

    for (const teacher of teachers) {
        if (teacher.email) {
            await sendEmail({
                to: teacher.email,
                templateName: 'student_feedback',
                data: {
                    teacherName: teacher.name || 'Teacher',
                    studentName: session.user.name,
                    feedbackMessage,
                }
            });
        }
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to send feedback:", error);
    return { success: false, error: "An error occurred while sending feedback." };
  }
}

export async function getTeachersForCurrentStudent() {
  const session = await auth();
  if (!session?.user?.id) {
    return [];
  }

  try {
    const teacherLinks = await prisma.teachersForStudent.findMany({
      where: { studentId: session.user.id },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            image: true,
            isSuspended: true,
          },
        },
      },
    });

    return teacherLinks
      .filter((link) => link.teacher && !link.teacher.isSuspended)
      .map((link) => ({
        id: link.teacher!.id,
        name: link.teacher!.name ?? 'Teacher',
        image: link.teacher!.image ?? null,
      }));
  } catch (error) {
    console.error('Failed to fetch student teachers:', error);
    return [];
  }
}

type RatingPayload = {
  teacherId: string;
  contentQuality: number;
  helpfulness: number;
  communication: number;
  valueForMoney: number;
  overall?: number;
  comments?: string;
};

const clampRating = (value: number) => {
  if (Number.isNaN(value)) return 0;
  return Math.min(5, Math.max(0, value));
};

export async function submitTeacherRating(payload: RatingPayload) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!payload.teacherId) {
    return { success: false, error: 'Select a teacher to continue.' };
  }

  try {
    const link = await prisma.teachersForStudent.findFirst({
      where: {
        studentId: session.user.id,
        teacherId: payload.teacherId,
      },
    });

    if (!link) {
      return { success: false, error: "You can only rate teachers you're assigned to." };
    }

    await prisma.teacherRating.create({
      data: {
        studentId: session.user.id,
        teacherId: payload.teacherId,
        contentQuality: clampRating(payload.contentQuality),
        helpfulness: clampRating(payload.helpfulness),
        communication: clampRating(payload.communication),
        valueForMoney: clampRating(payload.valueForMoney),
        overall: payload.overall ? clampRating(payload.overall) : null,
        comments: payload.comments?.trim() || null,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to submit teacher rating:', error);
    return { success: false, error: 'Something went wrong while saving your rating.' };
  }
}

/**
 * Checks if a student has reached a 10-lesson milestone and sends a notification.
 */
export async function checkAndSendMilestoneEmail(studentId: string) {
  try {
    const student = await prisma.user.findUnique({ where: { id: studentId } });
    if (!student || !student.email) return;

    const completedCount = await prisma.assignment.count({
      where: {
        studentId: studentId,
        status: { in: [AssignmentStatus.COMPLETED, AssignmentStatus.GRADED] },
      },
    });

    if (completedCount > 0 && completedCount % 10 === 0) {
      const lastAssignment = await prisma.assignment.findFirst({
        where: { studentId: studentId, status: { in: [AssignmentStatus.COMPLETED, AssignmentStatus.GRADED] } },
        orderBy: [ { gradedAt: 'desc' }, { assignedAt: 'desc' } ],
      });

      if (lastAssignment && !lastAssignment.milestoneNotified) {
        await sendEmail({
          to: student.email,
          templateName: 'milestone_celebration',
          data: {
            studentName: student.name || 'Student',
            button: createButton('View Your Progress', `${process.env.AUTH_URL}/my-lessons`),
          }
        });
        
        await prisma.assignment.update({
          where: { id: lastAssignment.id },
          data: { milestoneNotified: true },
        });
      }
    }
  } catch (error) {
    console.error("Failed to check for milestone:", error);
  }
}

/**
 * Fetches and calculates data for the student leaderboard.
 */
export async function getLeaderboardData() {
  try {
    const session = await auth();
    if (!session?.user?.id) return [];

    // Determine the current student's teachers
    const teacherLinks = await prisma.teachersForStudent.findMany({
      where: { studentId: session.user.id },
      select: { teacherId: true },
    });
    const teacherIds = teacherLinks.map(t => t.teacherId);
    if (teacherIds.length === 0) return [];

    // Fetch peers: same teachers, not on break
    const students = await prisma.user.findMany({
      where: {
        role: Role.STUDENT,
        isTakingBreak: false,
        teachers: { some: { teacherId: { in: teacherIds } } },
      },
      select: {
        id: true,
        name: true,
        image: true,
        totalPoints: true,
        badges: {
          orderBy: { awardedAt: 'desc' },
          take: 3,
          select: {
            badge: {
              select: {
                slug: true,
                name: true,
                icon: true,
              },
            },
            awardedAt: true,
          },
        },
        assignments: {
          where: {
            status: { in: [AssignmentStatus.PENDING, AssignmentStatus.COMPLETED, AssignmentStatus.GRADED, AssignmentStatus.FAILED] },
          },
          select: {
            id: true,
            status: true,
            score: true,
            pointsAwarded: true,
            extraPoints: true,
            gradedAt: true,
            assignedAt: true,
            deadline: true,
            originalDeadline: true,
            answers: true,
            lesson: { select: { price: true, type: true, composerConfig: { select: { maxTries: true } } } },
          },
        },
      },
    });

    const studentIds = students.map((s) => s.id);
    const goldStarSums = await prisma.goldStar.groupBy({
      by: ['studentId'],
      where: { studentId: { in: studentIds } },
      _sum: { amountEuro: true },
    });
    const goldStarByStudent = new Map(goldStarSums.map((row) => [row.studentId, row._sum.amountEuro ?? 0]));
    const arkaningSums = await prisma.pointTransaction.groupBy({
      by: ['userId'],
      where: { userId: { in: studentIds }, reason: PointReason.ARKANING_GAME },
      _sum: { amountEuro: true },
    });
    const arkaningByStudent = new Map(
      arkaningSums.map((row) => [row.userId, Number(row._sum.amountEuro ?? 0)]),
    );
    const newsArticleSums = await prisma.pointTransaction.groupBy({
      by: ['userId'],
      where: { userId: { in: studentIds }, reason: PointReason.NEWS_ARTICLE_TAP },
      _sum: { amountEuro: true },
    });
    const newsArticleByStudent = new Map(
      newsArticleSums.map((row) => [row.userId, Number(row._sum.amountEuro ?? 0)]),
    );
    const marketplaceSums = await prisma.pointTransaction.groupBy({
      by: ['userId'],
      where: { userId: { in: studentIds }, reason: PointReason.MARKETPLACE_PURCHASE },
      _sum: { amountEuro: true },
    });
    const marketplaceByStudent = new Map(
      marketplaceSums.map((row) => [row.userId, Number(row._sum.amountEuro ?? 0)]),
    );

    const studentStats = students.map(student => {
      const completedAssignments = student.assignments.filter(a => a.status === AssignmentStatus.COMPLETED || a.status === AssignmentStatus.GRADED);
      const completedCount = completedAssignments.length;
      const testsTaken = student.assignments.length;

      let totalCompletionTime = 0;
      completedAssignments.forEach(a => {
        if (a.gradedAt) {
          totalCompletionTime += new Date(a.gradedAt).getTime() - new Date(a.assignedAt).getTime();
        }
      });
      const averageCompletionTime = completedCount > 0 ? totalCompletionTime / completedCount : 0;

      // Savings logic: match My Progress: +price for GRADED, -price for FAILED
      let savings = 0;
      let extensionSpend = 0;
      student.assignments.forEach(a => {
        const price = a.lesson?.price ? Number(a.lesson.price.toString()) : 0;
        if (a.status === AssignmentStatus.GRADED && a.score !== null && a.score >= 0) savings += price;
        if (a.status === AssignmentStatus.GRADED && a.extraPoints) {
          savings += convertExtraPointsToEuro(a.extraPoints);
        }
        if (a.status === AssignmentStatus.FAILED) savings -= price;
        if (
          a.lesson?.type === LessonType.COMPOSER &&
          (a.status === AssignmentStatus.GRADED || a.status === AssignmentStatus.FAILED)
        ) {
          const extraTries = getComposerExtraTries(a.answers, a.lesson.composerConfig?.maxTries ?? 1);
          savings -= extraTries * 50;
        }

        if (isExtendedDeadline(a.deadline, a.originalDeadline)) {
          extensionSpend += EXTENSION_POINT_COST;
        }
      });

      savings -= extensionSpend;
      savings += goldStarByStudent.get(student.id) ?? 0;
      savings += arkaningByStudent.get(student.id) ?? 0;
      savings += newsArticleByStudent.get(student.id) ?? 0;
      savings += marketplaceByStudent.get(student.id) ?? 0;

      const derivedPoints = student.assignments.reduce(
        (sum, assignment) => sum + (assignment.pointsAwarded ?? 0),
        0
      );

      let totalPoints = student.totalPoints ?? derivedPoints;

      return {
        id: student.id,
        name: student.name,
        image: student.image,
        completedCount,
        averageCompletionTime,
        savings,
        totalPoints,
        testsTaken,
        recentBadges: student.badges.map(({ badge }) => ({
          slug: badge.slug,
          name: badge.name,
          icon: badge.icon,
        })),
      };
    })
    // Include students who have any relevant assignment (COMPLETED, GRADED, or FAILED),
    // even if their completedCount is 0 (e.g., only FAILED so far).
    .filter((_s, idx) => students[idx].assignments.length > 0);

    const allTimes = studentStats.map(s => s.averageCompletionTime).filter(t => t > 0);
    if (allTimes.length > 1) {
        const avg = allTimes.reduce((a, b) => a + b, 0) / allTimes.length;
        const stdDev = Math.sqrt(allTimes.map(x => Math.pow(x - avg, 2)).reduce((a, b) => a + b) / allTimes.length);
        
        studentStats.forEach(s => {
            if (s.averageCompletionTime < avg - 0.5 * stdDev) {
                (s as any).speedTier = 'fast';
            } else if (s.averageCompletionTime > avg + 0.5 * stdDev) {
                (s as any).speedTier = 'slow';
            } else {
                (s as any).speedTier = 'average';
            }
        });
    }

    const leaderboard = studentStats.sort((a, b) =>
      b.totalPoints - a.totalPoints ||
      b.completedCount - a.completedCount ||
      a.averageCompletionTime - b.averageCompletionTime
    ).slice(0, 12);
    
    return leaderboard;
  } catch (error) {
    console.error("Failed to fetch leaderboard data:", error);
    return [];
  }
}

export async function getStudentLeaderboardProfile(studentId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return null;

    const viewerId = session.user.id;
    const viewerRole = session.user.role as Role | undefined;

    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        name: true,
        image: true,
        email: true,
        studentBio: true,
        totalPoints: true,
        teachers: { select: { teacherId: true } },
        assignments: {
          where: {
            status: { in: [AssignmentStatus.PENDING, AssignmentStatus.COMPLETED, AssignmentStatus.GRADED, AssignmentStatus.FAILED] },
          },
          select: {
            id: true,
            status: true,
            score: true,
            pointsAwarded: true,
            extraPoints: true,
            gradedAt: true,
            assignedAt: true,
            deadline: true,
            originalDeadline: true,
            answers: true,
            lesson: { select: { price: true, type: true, composerConfig: { select: { maxTries: true } } } },
          },
          orderBy: { assignedAt: 'desc' },
        },
        badges: {
          orderBy: { awardedAt: 'desc' },
          take: 8,
          select: {
            badge: {
              select: {
                slug: true,
                name: true,
                icon: true,
              },
            },
          },
        },
      },
    });

    const goldStarSum = await prisma.goldStar.aggregate({
      where: { studentId },
      _sum: { amountEuro: true },
    });
    const [arkaningSum, newsArticleSum, marketplaceSum] = await Promise.all([
      prisma.pointTransaction.aggregate({
        where: { userId: studentId, reason: PointReason.ARKANING_GAME },
        _sum: { amountEuro: true },
      }),
      prisma.pointTransaction.aggregate({
        where: { userId: studentId, reason: PointReason.NEWS_ARTICLE_TAP },
        _sum: { amountEuro: true },
      }),
      prisma.pointTransaction.aggregate({
        where: { userId: studentId, reason: PointReason.MARKETPLACE_PURCHASE },
        _sum: { amountEuro: true },
      }),
    ]);

    if (!student) return null;

    const isSelf = viewerId === studentId;
    let canView = isSelf;

    if (!canView) {
      if (viewerRole === Role.ADMIN) {
        canView = true;
      } else if (viewerRole === Role.TEACHER) {
        const teachesStudent = await prisma.teachersForStudent.findFirst({
          where: { teacherId: viewerId, studentId },
          select: { studentId: true },
        });
        canView = Boolean(teachesStudent);
      } else {
        const viewerTeachers = await prisma.teachersForStudent.findMany({
          where: { studentId: viewerId },
          select: { teacherId: true },
        });
        const viewerTeacherIds = viewerTeachers.map((t) => t.teacherId);
        const studentTeacherIds = student.teachers.map((t) => t.teacherId);
        canView = viewerTeacherIds.some((id) => studentTeacherIds.includes(id));
      }
    }

    if (!canView) return null;

    const completedAssignments = student.assignments.filter(
      (assignment) =>
        assignment.status === AssignmentStatus.COMPLETED || assignment.status === AssignmentStatus.GRADED
    );
    const testsTaken = student.assignments.length;
    const completedCount = completedAssignments.length;

    let totalCompletionTime = 0;
    completedAssignments.forEach((assignment) => {
      if (assignment.gradedAt) {
        totalCompletionTime +=
          new Date(assignment.gradedAt).getTime() - new Date(assignment.assignedAt).getTime();
      }
    });
    const averageCompletionTime = completedCount > 0 ? totalCompletionTime / completedCount : 0;

    let savings = 0;
    let extensionSpend = 0;
    student.assignments.forEach((assignment) => {
      const price = assignment.lesson?.price ? Number(assignment.lesson.price.toString()) : 0;
      if (assignment.status === AssignmentStatus.GRADED && assignment.score !== null && assignment.score >= 0) {
        savings += price;
      }
      if (assignment.status === AssignmentStatus.GRADED && assignment.extraPoints) {
        savings += convertExtraPointsToEuro(assignment.extraPoints);
      }
      if (assignment.status === AssignmentStatus.FAILED) {
        savings -= price;
      }
      if (
        assignment.lesson?.type === LessonType.COMPOSER &&
        (assignment.status === AssignmentStatus.GRADED || assignment.status === AssignmentStatus.FAILED)
      ) {
        const extraTries = getComposerExtraTries(assignment.answers, assignment.lesson.composerConfig?.maxTries ?? 1);
        savings -= extraTries * 50;
      }

      if (isExtendedDeadline(assignment.deadline, assignment.originalDeadline)) {
        extensionSpend += EXTENSION_POINT_COST;
      }
    });

    savings -= extensionSpend;
    savings += goldStarSum._sum.amountEuro ?? 0;
    savings += Number(arkaningSum._sum.amountEuro ?? 0);
    savings += Number(newsArticleSum._sum.amountEuro ?? 0);
    savings += Number(marketplaceSum._sum.amountEuro ?? 0);

    const derivedPoints = student.assignments.reduce(
      (sum, assignment) => sum + (assignment.pointsAwarded ?? 0),
      0
    );

    let totalPoints = student.totalPoints ?? derivedPoints;
    // totalPoints stays derived from the stored total to keep live math.
    const completionRate = testsTaken > 0 ? completedCount / testsTaken : 0;

    return {
      id: student.id,
      name: student.name ?? 'Anonymous',
      image: student.image,
      email: student.email ?? '',
      studentBio: student.studentBio ?? '',
      stats: {
        testsTaken,
        completedCount,
        completionRate,
        averageCompletionTime,
        savings,
        totalPoints,
      },
      recentBadges: student.badges.map(({ badge }) => ({
        slug: badge.slug,
        name: badge.name,
        icon: badge.icon,
      })),
      isSelf,
    };
  } catch (error) {
    console.error("Failed to fetch student leaderboard profile:", error);
    return null;
  }
}

export async function getStudentGamification() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  try {
    return await getStudentGamificationSnapshot(session.user.id);
  } catch (error) {
    console.error('Failed to fetch student gamification snapshot:', error);
    return null;
  }
}
