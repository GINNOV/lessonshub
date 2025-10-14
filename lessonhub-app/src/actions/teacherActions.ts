// file: src/actions/teacherActions.ts
'use server';

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { Role, AssignmentStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

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
        return { success: true };

    } catch (error) {
        console.error("Failed to update teacher preferences:", error);
        return { success: false, error: "An error occurred." };
    }
}

/**
 * Fetches and calculates data for the teacher's class leaderboard.
 */
export async function getLeaderboardDataForTeacher(teacherId: string) {
  try {
    const assignedStudentRelations = await prisma.teachersForStudent.findMany({
      where: { teacherId },
      select: { studentId: true }
    });
    const assignedStudentIds = assignedStudentRelations.map(r => r.studentId);

    if (assignedStudentIds.length === 0) {
      return [];
    }

    const students = await prisma.user.findMany({
      where: { id: { in: assignedStudentIds } },
      select: {
        id: true,
        name: true,
        image: true,
        assignments: {
          where: {
            status: AssignmentStatus.GRADED,
            lesson: { teacherId: teacherId },
          },
          select: {
            id: true,
            score: true,
          },
        },
      },
    });

    const studentStats = students.map(student => {
      const completedCount = student.assignments.length;
      const totalScore = student.assignments.reduce((sum, a) => sum + (a.score || 0), 0);
      
      return {
        id: student.id,
        name: student.name,
        image: student.image,
        completedCount,
        totalScore,
      };
    })
    .filter(s => s.completedCount > 0)
    .sort((a, b) => b.totalScore - a.totalScore || b.completedCount - a.completedCount);

    return studentStats;
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

    const [
      totalStudents,
      studentsOnBreak,
      totalLessons,
      lessonsThisWeek,
    ] = await Promise.all([
      prisma.user.count({ where: { role: Role.STUDENT } }),
      prisma.user.count({ where: { role: Role.STUDENT, isTakingBreak: true } }),
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
    ]);
    
    const lessonsThisWeekDays = lessonsThisWeek.map(lesson => new Date(lesson.deadline).getDay());

    return {
      totalStudents,
      studentsOnBreak,
      totalLessons,
      lessonsThisWeek: lessonsThisWeekDays,
    };
  } catch (error) {
    console.error("Failed to fetch teacher dashboard stats:", error);
    return {
      totalStudents: 0,
      studentsOnBreak: 0,
      totalLessons: 0,
      lessonsThisWeek: [],
    };
  }
}
