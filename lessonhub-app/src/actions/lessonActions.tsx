'use server';

import prisma from "@/lib/prisma";
import { Role, AssignmentStatus } from "@prisma/client";
import { revalidatePath } from 'next/cache';
import { getEmailTemplateByName } from '@/actions/adminActions';
import { replacePlaceholders, createButton } from '@/lib/email-templates';
import { auth } from "@/auth";

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
        assignments: true,
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
 * Fetches all submissions for a given lesson, ensuring the request is made by the lesson's teacher.
 * @param lessonId The ID of the lesson.
 * @param teacherId The ID of the teacher making the request.
 * @returns A promise that resolves to an array of assignments with student details.
 */
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

/**
 * Fetches a specific assignment submission for a teacher to grade.
 * @param assignmentId The ID of the assignment.
 * @param teacherId The ID of the teacher.
 * @returns A promise that resolves to the assignment object or null if not found.
 */
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

/**
 * Fetches a specific assignment for a student.
 * @param assignmentId The ID of the assignment.
 * @param studentId The ID of the student.
 * @returns A promise that resolves to the assignment object or null if not found.
 */
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
        lesson: {
          include: {
            teacher: true,
          },
        },
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
  const session = await auth();
  if (!session?.user?.id || session.user.role !== Role.TEACHER) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Ensure the lesson belongs to the logged-in teacher before deleting
    const lesson = await prisma.lesson.findFirst({
      where: {
        id: lessonId,
        teacherId: session.user.id,
      },
    });

    if (!lesson) {
      return { success: false, error: "Lesson not found or you don't have permission to delete it." };
    }

    await prisma.lesson.delete({
      where: {
        id: lessonId,
      },
    });

    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error("Failed to delete lesson:", error);
    // Be careful not to leak sensitive error details
    return { success: false, error: "An error occurred while deleting the lesson." };
  }
}

/**
 * Sends a manual reminder email to a student for a pending assignment.
 * @param assignmentId The ID of the assignment.
 * @returns An object indicating success or failure.
 */
export async function sendManualReminder(assignmentId: string) {
  try {
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        student: true,
        lesson: {
          include: {
            teacher: true,
          },
        },
      },
    });

    if (!assignment || !assignment.student.email) {
      throw new Error("Assignment or student email not found.");
    }

    if (assignment.status !== AssignmentStatus.PENDING) {
      return { success: false, error: 'This assignment is not pending.' };
    }
    
    const template = await getEmailTemplateByName('manual_reminder');
    if (!template) {
        return { success: false, error: 'Manual reminder email template not found.' };
    }
    
    const assignmentUrl = `${process.env.AUTH_URL}/assignments/${assignment.id}`;
    
    const subject = replacePlaceholders(template.subject, { lessonTitle: assignment.lesson.title });
    const body = replacePlaceholders(template.body, {
        studentName: assignment.student.name || 'student',
        teacherName: assignment.lesson.teacher.name || 'your teacher',
        lessonTitle: assignment.lesson.title,
        button: createButton('View Assignment', assignmentUrl, 'warning'),
    });

    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: process.env.EMAIL_FROM,
            to: assignment.student.email,
            subject,
            html: body,
        }),
      });

    if (!response.ok) {
        const errorBody = await response.json();
        return { success: false, error: `Resend error: ${errorBody.message}` };
    }
    
    return { success: true };

  } catch (error) {
    console.error("Failed to send reminder:", error);
    return { success: false, error: (error as Error).message };
  }
}


/**
 * Fails an assignment for a student.
 * @param assignmentId The ID of the assignment.
 * @returns An object indicating success or failure.
 */
export async function failAssignment(assignmentId: string) {
  try {
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        student: true,
        lesson: true,
      },
    });

    if (!assignment) {
      throw new Error("Assignment not found.");
    }

    await prisma.assignment.update({
      where: { id: assignmentId },
      data: { status: AssignmentStatus.FAILED },
    });
    
    const template = await getEmailTemplateByName('failed');
    if (template && assignment.student.email) {
      const assignmentUrl = `${process.env.AUTH_URL}/assignments/${assignment.id}`;
      const subject = replacePlaceholders(template.subject, { lessonTitle: assignment.lesson.title });
      const body = replacePlaceholders(template.body, {
          studentName: assignment.student.name || 'student',
          lessonTitle: assignment.lesson.title,
          button: createButton('View Assignment', assignmentUrl, 'destructive'),
      });
      
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM,
          to: assignment.student.email,
          subject,
          html: body,
        }),
      });
    }
    
    revalidatePath(`/dashboard/submissions/${assignment.lessonId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to fail assignment:", error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Fetches a lesson for the share page.
 * @param lessonId The ID of the lesson.
 * @returns A promise that resolves to the lesson object or null if not found.
 */
export async function getLessonForSharePage(lessonId: string) {
  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
    });
    return lesson;
  } catch (error) {
    console.error("Failed to fetch lesson for share page:", error);
    return null;
  }
}

/**
 * Assigns a lesson to a student if they are not already assigned.
 * @param lessonId The ID of the lesson.
 * @param studentId The ID of the student.
 * @returns A promise that resolves to the assignment object.
 */
export async function assignLessonToStudent(lessonId: string, studentId: string) {
  try {
    const existingAssignment = await prisma.assignment.findUnique({
      where: {
        lessonId_studentId: {
          lessonId,
          studentId,
        },
      },
    });

    if (existingAssignment) {
      return existingAssignment;
    }

    const newAssignment = await prisma.assignment.create({
      data: {
        lessonId,
        studentId,
        deadline: new Date(Date.now() + 36 * 60 * 60 * 1000), // Default deadline 36 hours from now
      },
    });
    
    revalidatePath('/my-lessons');
    return newAssignment;
  } catch (error) {
    console.error("Failed to assign lesson to student:", error);
    return null;
  }
}