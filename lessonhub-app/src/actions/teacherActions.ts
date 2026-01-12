// file: src/actions/teacherActions.ts
'use server';

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { Role, AssignmentStatus, LessonType, PointReason } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { createButton } from "@/lib/email-templates";
import { sendEmail } from "@/lib/email-templates.server";
import { EXTENSION_POINT_COST, isExtendedDeadline } from "@/lib/lessonExtensions";
import { ensureBadgeCatalog } from "@/lib/gamification";
import { getEmailTemplateByName } from "@/actions/adminActions";
import { convertExtraPointsToEuro, convertEuroToPoints, GOLD_STAR_POINTS, GOLD_STAR_VALUE_EURO } from "@/lib/points";
import { getComposerExtraTries } from "@/lib/composer";

/**
 * Fetches the preferences for the currently logged-in teacher.
 */
export async function getTeacherPreferences() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== Role.TEACHER) {
    return null;
  }

  try {
    const teacher = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        defaultLessonPrice: true,
        defaultLessonPreview: true,
        defaultLessonNotes: true,
        defaultLessonInstructions: true,
      },
    });
    return teacher;
  } catch (error) {
    console.error("Failed to fetch teacher preferences:", error);
    return null;
  }
}

interface TeacherPreferences {
    defaultLessonPrice?: number;
    defaultLessonPreview?: string;
    defaultLessonNotes?: string;
    defaultLessonInstructions?: string;
}

/**
 * Updates the preferences for the currently logged-in teacher.
 */
export async function updateTeacherPreferences(data: TeacherPreferences) {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== Role.TEACHER) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                defaultLessonPrice: data.defaultLessonPrice,
                defaultLessonPreview: data.defaultLessonPreview,
                defaultLessonNotes: data.defaultLessonNotes,
                defaultLessonInstructions: data.defaultLessonInstructions,
            },
        });

        revalidatePath('/dashboard');
        revalidatePath('/dashboard/create');
        revalidatePath('/dashboard/create/flashcard');
        revalidatePath('/dashboard/create/multi-choice');
        revalidatePath('/dashboard/settings');
        return { success: true };

    } catch (error) {
        console.error("Failed to update teacher preferences:", error);
        return { success: false, error: "An error occurred." };
    }
}

export async function sendGoldStar(studentId: string, message: string, amountEuro?: number) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== Role.TEACHER) {
    return { success: false, error: "Unauthorized" };
  }

  const trimmedMessage = message?.trim().slice(0, 500) || "";
  const normalizedAmount = typeof amountEuro === "number" && Number.isFinite(amountEuro)
    ? Math.max(0, Math.round(amountEuro))
    : GOLD_STAR_VALUE_EURO;
  const awardPoints = convertEuroToPoints(normalizedAmount);

  const teacher = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true },
  });

  if (!teacher) {
    return { success: false, error: "Unauthorized" };
  }

  const link = await prisma.teachersForStudent.findFirst({
    where: { teacherId: teacher.id, studentId },
  });

  if (!link) {
    return { success: false, error: "You can only send stars to your assigned students." };
  }

  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { id: true, email: true, name: true, totalPoints: true },
  });

  if (!student) {
    return { success: false, error: "Student not found." };
  }

  await ensureBadgeCatalog();

  const goldStarBadge = await prisma.badge.findUnique({ where: { slug: 'gold-star' } });

  try {
    await prisma.$transaction(async (tx) => {
      await tx.goldStar.create({
        data: {
          studentId,
          teacherId: teacher.id,
          message: trimmedMessage || null,
          amountEuro: normalizedAmount,
          points: awardPoints,
        },
      });

      const updatedPoints = (student.totalPoints ?? 0) + awardPoints;
      await tx.user.update({
        where: { id: studentId },
        data: { totalPoints: updatedPoints },
      });

      await tx.pointTransaction.create({
        data: {
          userId: studentId,
          points: awardPoints,
          reason: PointReason.MANUAL_ADJUSTMENT,
          note: `Gold star from ${teacher.name || "Teacher"}${trimmedMessage ? `: ${trimmedMessage}` : ""}`,
        },
      });

      if (goldStarBadge) {
        await tx.userBadge.upsert({
          where: {
            userId_badgeId: {
              userId: studentId,
              badgeId: goldStarBadge.id,
            },
          },
          update: {},
          create: {
            userId: studentId,
            badgeId: goldStarBadge.id,
            assignmentId: null,
            metadata: { awardedBy: teacher.id },
          },
        });
      }
    });

    const template = await getEmailTemplateByName('gold_star');
    if (template && student.email) {
      const profileUrl = `${process.env.AUTH_URL}/profile/${studentId}`;
      await sendEmail({
        to: student.email,
        templateName: 'gold_star',
        data: {
          studentName: student.name || 'Student',
          teacherName: teacher.name || 'Your teacher',
          message: trimmedMessage,
          amount: `€${normalizedAmount}`,
          points: awardPoints.toString(),
          button: createButton('View your profile', profileUrl, template.buttonColor || undefined),
        },
      });
    }

    revalidatePath(`/profile/${studentId}`);
    revalidatePath('/dashboard');
    revalidatePath('/my-lessons');

    return { success: true };
  } catch (error) {
    console.error("Failed to send gold star:", error);
    return { success: false, error: "Unable to send gold star right now." };
  }
}

export async function updateTeacherBio(teacherBio: string) {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== Role.TEACHER) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        await prisma.user.update({
            where: { id: session.user.id },
            data: { teacherBio },
        });
        revalidatePath('/teachers');
        return { success: true };
    } catch (error) {
        console.error("Failed to update teacher bio:", error);
        return { success: false, error: "Failed to update bio." };
    }
}

/**
 * Fetches and calculates data for the teacher's class leaderboard.
 */
export async function getLeaderboardDataForTeacher(teacherId: string, classId?: string) {
  try {
    const assignedStudentRelations = await prisma.teachersForStudent.findMany({
      where: { teacherId, ...(classId ? { classId } : {}) },
      select: { studentId: true }
    });
    const assignedStudentIds = assignedStudentRelations.map(r => r.studentId);

    if (assignedStudentIds.length === 0) {
      return [];
    }

    const students = await prisma.user.findMany({
      where: {
        id: { in: assignedStudentIds },
        isTakingBreak: false,
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
          },
        },
        assignments: {
          where: {
            status: { in: [AssignmentStatus.PENDING, AssignmentStatus.COMPLETED, AssignmentStatus.GRADED, AssignmentStatus.FAILED] },
            lesson: { teacherId: teacherId },
          },
          select: {
            id: true,
            status: true,
            score: true,
            pointsAwarded: true,
            extraPoints: true,
            deadline: true,
            originalDeadline: true,
            answers: true,
            lesson: { select: { price: true, type: true, composerConfig: { select: { maxTries: true } } } },
          },
        },
      },
    });

    const goldStarSums = await prisma.goldStar.groupBy({
      by: ['studentId'],
      where: { studentId: { in: assignedStudentIds } },
      _sum: { amountEuro: true },
    });
    const goldStarByStudent = new Map(goldStarSums.map((row) => [row.studentId, row._sum.amountEuro ?? 0]));

    const studentStats = students
      .map(student => {
        const completedCount = student.assignments.filter(a => a.status === AssignmentStatus.COMPLETED || a.status === AssignmentStatus.GRADED).length;
        let savings = 0;
        let extensionSpend = 0;
        for (const a of student.assignments) {
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
        }

        savings -= extensionSpend;
        savings += goldStarByStudent.get(student.id) ?? 0;

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
          savings,
          totalPoints,
          testsTaken: student.assignments.length,
          recentBadges: student.badges.map(({ badge }) => ({
            slug: badge.slug,
            name: badge.name,
            icon: badge.icon,
          })),
        };
      })
      ;

    const leaderboard = studentStats
      .filter(s => s.testsTaken > 0)
      .sort((a, b) =>
        b.totalPoints - a.totalPoints ||
        b.savings - a.savings ||
        b.completedCount - a.completedCount
      );

    return leaderboard as Array<{
      id: string;
      name: string | null;
      image: string | null;
      completedCount: number;
      savings: number;
      totalPoints: number;
      recentBadges: Array<{ slug: string; name: string; icon: string | null }>;
    }>;
  } catch (error) {
    console.error("Failed to fetch teacher leaderboard data:", error);
    return [];
  }
}

export async function getTeacherDashboardStats(teacherId: string) {
  try {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const now = new Date();

    const [
      totalStudents,
      studentsOnBreak,
      totalLessons,
      lessonsThisWeek,
      pastDueLessons,
      completedLessons,
      emptyLessons,
      visibleGuides,
    ] = await Promise.all([
      // Count only students assigned to this teacher
      prisma.teachersForStudent.count({ where: { teacherId } }),
      // Count students on break among those assigned to this teacher
      prisma.user.count({
        where: {
          role: Role.STUDENT,
          isTakingBreak: true,
          teachers: { some: { teacherId } },
        },
      }),
      prisma.lesson.count({ where: { teacherId } }),
      prisma.assignment.findMany({
        where: {
          lesson: {
            teacherId,
          },
          startDate: {
            gte: startOfWeek,
            lte: endOfWeek,
          },
        },
        select: {
          startDate: true,
          assignedAt: true,
        },
      }),
      prisma.lesson.count({
        where: {
          teacherId,
          assignments: {
            some: {
              status: AssignmentStatus.PENDING,
              deadline: { lt: now },
            },
          },
        },
      }),
      prisma.lesson.count({
        where: {
          teacherId,
          assignments: {
            some: {
              status: AssignmentStatus.COMPLETED,
            },
          },
        },
      }),
      prisma.lesson.count({
        where: {
          teacherId,
          assignments: {
            none: {},
          },
          type: {
            not: LessonType.LEARNING_SESSION,
          },
        },
      }),
      prisma.lesson.count({
        where: {
          teacherId,
          type: LessonType.LEARNING_SESSION,
          guideIsVisible: true,
        },
      }),
    ]);
    
    const lessonsThisWeekDays = lessonsThisWeek
      .map((lesson) => lesson.startDate ?? lesson.assignedAt)
      .filter((date): date is Date => !!date && !Number.isNaN(new Date(date).getTime()))
      .map((date) => new Date(date).getDay());

    return {
      totalStudents,
      studentsOnBreak,
      totalLessons,
      lessonsThisWeek: lessonsThisWeekDays,
      pastDueLessons,
      completedLessons,
      emptyLessons,
      visibleGuides,
    };
  } catch (error) {
    console.error("Failed to fetch teacher dashboard stats:", error);
    return {
      totalStudents: 0,
      studentsOnBreak: 0,
      totalLessons: 0,
      lessonsThisWeek: [],
      pastDueLessons: 0,
      completedLessons: 0,
      emptyLessons: 0,
      visibleGuides: 0,
    };
  }
}
