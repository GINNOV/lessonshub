// file: src/app/actions/lessonActions.ts

'use server';

import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";

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
        lesson: { // For each assignment, include the lesson details
          include: {
            teacher: true, // In the lesson details, include the teacher's info
          },
        },
      },
      orderBy: {
        deadline: 'asc', // Show assignments with the soonest deadline first
      },
    });
    return assignments;
  } catch (error) {
    console.error("Failed to fetch assignments:", error);
    return [];
  }
}