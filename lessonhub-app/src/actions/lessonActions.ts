// file: src/actions/lessonActions.ts

'use server';

import prisma from "@/lib/prisma";
import { Role, AssignmentStatus } from "@prisma/client";
import { revalidatePath } from 'next/cache';

/**
 * Fetches all lessons created by a specific teacher.
 * @param teacherId The ID of the teacher.
 * @returns A promise that resolves to an array of lessons.
 */
export async function getLessonsForTeacher(teacherId: string) {
  if (!teacherId) {
    return [];
  }
  try {
    const lessons = await prisma.lesson.findMany({
      where: {
        teacherId: teacherId,
      },
      include: {
        assignments: {
          select: {
            status: true,
            deadline: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return lessons;
  } catch (error) {
    console.error("Failed to fetch lessons:", error);
    return [];
  }
}

export async function getSubmissionsForLesson(lessonId: string, teacherId: string) {
  if (!lessonId || !teacherId) {
    return [];
  }

  try {
    const assignments = await prisma.assignment.findMany({
      where: {
        lessonId: lessonId,
        lesson: {
          teacherId: teacherId,
        },
      },
      include: {
        student: true,
      },
      orderBy: {
        assignedAt: 'asc',
      },
    });
    return assignments;
  } catch (error) {
    console.error("Failed to fetch submissions:", error);
    return [];
  }
}

/**
 * Fetches a single lesson by its unique ID.
 * @param lessonId The ID of the lesson.
 * @returns A promise that resolves to the lesson object or null if not found.
 */
export async function getLessonById(lessonId: string) {
  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
    });
    return lesson;
  } catch (error) {
    console.error("Failed to fetch lesson:", error);
    return null;
  }
}

/**
 * Fetches all users with the 'STUDENT' role.
 * @returns A promise that resolves to an array of student users.
 */
export async function getAllStudents() {
  try {
    const students = await prisma.user.findMany({
      where: { role: Role.STUDENT },
      orderBy: { email: 'asc' },
    });
    return students;
  } catch (error) {
    console.error("Failed to fetch students:", error);
    return [];
  }
}

/**
 * Fetches all assignments for a specific student, including related lesson and teacher info.
 * @param studentId The ID of the student.
 * @returns A promise that resolves to an array of assignments.
 */
export async function getAssignmentsForStudent(studentId: string) {
  if (!studentId) {
    return [];
  }

  try {
    const assignments = await prisma.assignment.findMany({
      where: {
        studentId: studentId,
      },
      include: {
        lesson: {
          include: {
            teacher: true,
          },
        },
      },
      orderBy: {
        deadline: 'asc',
      },
    });
    return assignments;
  } catch (error) {
    console.error("Failed to fetch assignments:", error);
    return [];
  }
}

export async function getSubmissionForGrading(assignmentId: string, teacherId: string) {
  if (!assignmentId || !teacherId) {
    return null;
  }
  try {
    const assignment = await prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        lesson: {
          teacherId: teacherId,
        },
      },
      include: {
        lesson: true,
        student: true,
      },
    });
    return assignment;
  } catch (error) {
    console.error("Failed to fetch submission for grading:", error);
    return null;
  }
}

export async function getAssignmentById(assignmentId: string, studentId: string) {
  if (!assignmentId || !studentId) {
    return null;
  }
  try {
    const assignment = await prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        studentId: studentId,
      },
      include: {
        lesson: true,
      },
    });
    return assignment;
  } catch (error) {
    console.error("Failed to fetch assignment:", error);
    return null;
  }
}

/**
 * Fetches all students and enriches them with stats like total points and last seen date.
 * @returns A promise that resolves to an array of student users with their stats.
 */
export async function getStudentsWithStats() {
  try {
    const students = await prisma.user.findMany({
      where: { role: Role.STUDENT },
      include: {
        assignments: {
          where: { status: AssignmentStatus.GRADED },
          select: {
            score: true,
          },
        },
      },
      orderBy: { email: 'asc' },
    });

    return students.map(student => {
      const totalPoints = student.assignments.reduce((sum, a) => sum + (a.score || 0), 0);
      return {
        ...student,
        totalPoints,
      };
    });

  } catch (error) {
    console.error("Failed to fetch students with stats:", error);
    return [];
  }
}

/**
 * Deletes a lesson by its ID.
 * @param lessonId The ID of the lesson to delete.
 * @returns An object indicating success or failure.
 */
export async function deleteLesson(lessonId: string) {
  try {
    const response = await fetch(`${process.env.AUTH_URL}/api/lessons/${lessonId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete lesson from API');
    }
    
    // Revalidate the dashboard path to show the updated list of lessons
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error("Failed to delete lesson:", error);
    return { success: false, error: (error as Error).message };
  }
}