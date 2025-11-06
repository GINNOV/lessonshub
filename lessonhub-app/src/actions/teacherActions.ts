// file: src/actions/teacherActions.ts
'use server';

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { Role, AssignmentStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { sendEmail, createButton } from "@/lib/email-templates";

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
            status: { in: [AssignmentStatus.COMPLETED, AssignmentStatus.GRADED, AssignmentStatus.FAILED] },
            lesson: { teacherId: teacherId },
          },
          select: {
            id: true,
            status: true,
            score: true,
            pointsAwarded: true,
            lesson: { select: { price: true } },
          },
        },
      },
    });

    const studentStats = students
      .map(student => {
        const completedCount = student.assignments.filter(a => a.status === AssignmentStatus.COMPLETED || a.status === AssignmentStatus.GRADED).length;
        let savings = 0;
        for (const a of student.assignments) {
          const price = a.lesson?.price ? Number(a.lesson.price.toString()) : 0;
          if (a.status === AssignmentStatus.GRADED && a.score !== null && a.score >= 0) savings += price;
          if (a.status === AssignmentStatus.FAILED) savings -= price;
        }

        const derivedPoints = student.assignments.reduce(
          (sum, assignment) => sum + (assignment.pointsAwarded ?? 0),
          0
        );

        const totalPoints = Math.max(student.totalPoints ?? 0, derivedPoints);

        return {
          id: student.id,
          name: student.name,
          image: student.image,
          completedCount,
          savings,
          totalPoints,
          recentBadges: student.badges.map(({ badge }) => ({
            slug: badge.slug,
            name: badge.name,
            icon: badge.icon,
          })),
        };
      })
      .filter(s => s.completedCount > 0 || s.savings !== 0)
      .sort((a, b) =>
        b.totalPoints - a.totalPoints ||
        b.savings - a.savings ||
        b.completedCount - a.completedCount
      );

    return studentStats as Array<{
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
          deadline: {
            gte: startOfWeek,
            lte: endOfWeek,
          },
        },
        select: {
          deadline: true,
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
        },
      }),
    ]);
    
    const lessonsThisWeekDays = lessonsThisWeek.map(lesson => new Date(lesson.deadline).getDay());

    return {
      totalStudents,
      studentsOnBreak,
      totalLessons,
      lessonsThisWeek: lessonsThisWeekDays,
      pastDueLessons,
      completedLessons,
      emptyLessons,
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
    };
  }
}
