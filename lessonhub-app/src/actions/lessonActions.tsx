'use server';

import prisma from "@/lib/prisma";
import { Role, AssignmentStatus } from "@prisma/client";
import { revalidatePath } from 'next/cache';
import { render } from '@react-email/render';
import ManualReminderEmail from '@/emails/ManualReminderEmail';
import FailedEmail from '@/emails/FailedEmail';

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
  try {
    const response = await fetch(`${process.env.AUTH_URL}/api/lessons/${lessonId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete lesson from API');
    }
    
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error("Failed to delete lesson:", error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Sends a manual reminder email to a student for a pending assignment.
 * @param assignmentId The ID of the assignment.
 * @returns An object indicating success or failure.
 */
export async function sendManualReminder(assignmentId: string) {
  // --- DEBUG: environment sanity + runtime info ---
  const missingEnv = [
    !process.env.AUTH_URL && 'AUTH_URL',
    !process.env.RESEND_API_KEY && 'RESEND_API_KEY',
    !process.env.EMAIL_FROM && 'EMAIL_FROM',
  ].filter(Boolean) as string[];

  if (missingEnv.length) {
    console.error('[sendManualReminder] Missing env vars:', missingEnv.join(', '));
    return { success: false, error: `Missing env vars: ${missingEnv.join(', ')}` };
  }

  console.log('[sendManualReminder] Runtime info', {
    node: process.version,
    platform: process.platform,
    vercel: !!process.env.VERCEL,
    envSanity: {
      AUTH_URL_set: !!process.env.AUTH_URL,
      RESEND_API_KEY_set: !!process.env.RESEND_API_KEY,
      EMAIL_FROM_set: !!process.env.EMAIL_FROM,
    },
  });

  const VERIFIED_DOMAIN = process.env.RESEND_VERIFIED_DOMAIN || 'quantifythis.com';
  const DEFAULT_FROM = `LessonHUB <noreply@${VERIFIED_DOMAIN}>`;

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

    const base = (process.env.AUTH_URL || '').replace(/\/+$/, '');
    const assignmentUrl = `${base}/assignments/${assignment.id}`;
    console.log('[sendManualReminder] assignmentUrl:', assignmentUrl);

    // Normalize sender and enforce verified domain
    const configuredFrom = process.env.EMAIL_FROM || DEFAULT_FROM;
    const fromMatch = configuredFrom.match(/<([^>]+)>/);
    const configuredFromEmail = (fromMatch ? fromMatch[1] : configuredFrom).trim();
    const configuredFromDomain = configuredFromEmail.split('@')[1] || '';

    let fromHeader = configuredFrom;
    if (configuredFromDomain.toLowerCase() !== VERIFIED_DOMAIN.toLowerCase()) {
      console.warn('[sendManualReminder] EMAIL_FROM domain mismatch; overriding to verified domain', {
        configuredFrom,
        configuredFromDomain,
        VERIFIED_DOMAIN,
      });
      fromHeader = DEFAULT_FROM;
    }

    // Render the email and surface render errors
    let emailHtml: string;
    try {
      emailHtml = await render(
        <ManualReminderEmail
          studentName={assignment.student.name}
          teacherName={assignment.lesson.teacher.name}
          lessonTitle={assignment.lesson.title}
          assignmentUrl={assignmentUrl}
        />
      );
    } catch (e: any) {
      console.error('[sendManualReminder] Email render failed:', e?.message || e);
      return { success: false, error: `Email render failed: ${e?.message || 'unknown error'}` };
    }

    const payload = {
      from: fromHeader,
      to: assignment.student.email,
      subject: `🚨 Reminder: Your assignment "${assignment.lesson.title}"`,
      html: emailHtml,
    } as const;

    console.log('[sendManualReminder] Sending via Resend', {
      to: payload.to,
      fromDomain: (fromHeader.match(/<([^>]+)>/)?.[1] || fromHeader).split('@')[1] || 'unknown',
      subject: payload.subject,
      htmlBytes: emailHtml?.length || 0,
    });

    let response: Response;
    try {
      response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (e: any) {
      console.error('[sendManualReminder] Network/Fetch error:', e?.message || e);
      return { success: false, error: `Network error sending email: ${e?.message || 'unknown error'}` };
    }

    // Read response safely as JSON or text for detailed diagnostics
    let respJson: any = null;
    let respText = '';
    try {
      respJson = await response.clone().json();
    } catch (_) {
      try { respText = await response.text(); } catch (_) { /* ignore */ }
    }

    const headersObj: Record<string, string> = {};
    try { response.headers.forEach((v, k) => (headersObj[k] = v)); } catch (_) { /* ignore */ }

    if (!response.ok) {
      const message = respJson?.message || respJson?.error || response.statusText || 'Unknown provider error';
      console.error('[sendManualReminder] Resend error', {
        status: response.status,
        statusText: response.statusText,
        body: respJson || respText,
        headers: headersObj,
      });
      return { success: false, error: `Resend error ${response.status}: ${message}` };
    }

    const id = respJson?.id || undefined;
    console.log('[sendManualReminder] Resend success', { status: response.status, id, body: respJson || respText });
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

    if (assignment.student.email) {
      const assignmentUrl = `${process.env.AUTH_URL}/assignments/${assignment.id}`;
      const emailHtml = await render(
        <FailedEmail
          studentName={assignment.student.name}
          lessonTitle={assignment.lesson.title}
          assignmentUrl={assignmentUrl}
        />
      );

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM,
          to: assignment.student.email,
          subject: `Update on your assignment: "${assignment.lesson.title}"`,
          html: emailHtml,
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