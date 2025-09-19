// file: src/actions/cronActions.tsx
'use server';

import { auth } from "@/auth";
import { Role } from "@prisma/client";
import { sendEmail, createButton } from '@/lib/email-templates';
import prisma from "@/lib/prisma";
import { getEmailTemplateByName } from "./adminActions";

/**
 * Sends a test email to the currently logged-in admin to verify cron functionality.
 */
export async function sendCronTestEmail() {
  const session = await auth();
  if (!session?.user?.email || session.user.role !== Role.ADMIN) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const recipient = session.user.email;
    const adminName = session.user.name || 'Admin';
    const currentTime = new Date().toLocaleString();

    console.log(`[CRON TEST] Attempting to send test email to ${recipient} at ${currentTime}`);

    await sendEmail({
      to: recipient,
      templateName: 'custom', // Use a generic template name
      data: {}, // No dynamic data needed for the body
      override: {
        subject: `[LessonHUB Cron Test] - ${currentTime}`,
        body: `
          <h1 style="color: #1d1c1d; font-size: 28px; font-weight: 700;">Cron Job Test</h1>
          <p>Hi ${adminName},</p>
          <p>This is an automated test email to verify that the cron job scheduling and email sending functionality are working correctly.</p>
          <p>Email generated at: <strong>${currentTime}</strong>.</p>
          <p>If you received this, the email action was triggered successfully.</p>
        `,
      },
    });

    console.log(`[CRON TEST] Successfully sent test email to ${recipient}`);
    return { success: true, message: `Email sent to ${recipient} at ${currentTime}` };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    console.error("[CRON TEST] Failed to send test email:", errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Processes lessons scheduled for assignment on the current day.
 */
export async function processScheduledAssignments() {
  console.log('Starting scheduled assignment cron job.');
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const lessonsToAssign = await prisma.lesson.findMany({
      where: {
        assignment_notification: 'ASSIGN_ON_DATE',
        scheduled_assignment_date: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        teacher: true,
      },
    });

    if (lessonsToAssign.length === 0) {
      console.log('No lessons scheduled for assignment today.');
      return { success: true, message: 'No lessons scheduled for assignment today.' };
    }

    console.log(`Found ${lessonsToAssign.length} lesson(s) to assign.`);
    const students = await prisma.user.findMany({ where: { role: 'STUDENT' } });
    if (students.length === 0) {
        console.log('No students found to assign lessons to.');
        return { success: true, message: 'No students found.' };
    }

    const template = await getEmailTemplateByName('new_assignment');
    if (!template) {
        console.error('"new_assignment" email template not found.');
        return { success: false, error: 'New assignment email template not found.' };
    }

    for (const lesson of lessonsToAssign) {
      const deadline = new Date(Date.now() + 36 * 60 * 60 * 1000); // Default 36h deadline
      const assignmentsData = students.map(student => ({
        lessonId: lesson.id,
        studentId: student.id,
        deadline: deadline,
      }));

      await prisma.assignment.createMany({
        data: assignmentsData,
        skipDuplicates: true,
      });

      for (const student of students) {
        if (student.email && lesson.teacher) {
          await sendEmail({
            to: student.email,
            templateName: 'new_assignment',
            data: {
              studentName: student.name || 'student',
              teacherName: lesson.teacher.name || 'your teacher',
              lessonTitle: lesson.title,
              deadline: new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeStyle: 'short' }).format(deadline),
              button: createButton('Start Lesson', `${process.env.AUTH_URL}/my-lessons`),
            }
          });
        }
      }

      await prisma.lesson.update({
        where: { id: lesson.id },
        data: { assignment_notification: 'ASSIGN_WITHOUT_NOTIFICATION' },
      });
      console.log(`Successfully assigned and notified for lesson: "${lesson.title}"`);
    }

    return { success: true, message: `Processed ${lessonsToAssign.length} scheduled lessons.` };
  } catch (error) {
    console.error('An unexpected error occurred in the scheduled assignment cron job:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}
