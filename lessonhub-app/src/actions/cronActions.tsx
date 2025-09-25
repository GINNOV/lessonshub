// file: src/actions/cronActions.tsx
'use server';

import prisma from "@/lib/prisma";
import { AssignmentStatus, Role } from "@prisma/client";
import { getEmailTemplateByName } from '@/actions/adminActions';
import { createButton, sendEmail } from '@/lib/email-templates';
import { auth } from "@/auth";

export async function sendDeadlineReminders() {
  const now = new Date();
  const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const assignments = await prisma.assignment.findMany({
    where: {
      status: AssignmentStatus.PENDING,
      deadline: {
        gte: now,
        lte: twentyFourHoursFromNow,
      },
      reminderSentAt: null,
    },
    include: {
      student: true,
      lesson: {
        include: {
          teacher: true,
        },
      },
    },
  });

  if (assignments.length === 0) {
    return { success: true, message: "No reminders to send." };
  }

  const template = await getEmailTemplateByName('reminder');
  if (!template) {
    console.error("Reminder email template not found.");
    return { success: false, message: "Reminder email template not found." };
  }

  for (const assignment of assignments) {
    if (assignment.student.email && assignment.lesson.teacher) {
      const assignmentUrl = `${process.env.AUTH_URL}/assignments/${assignment.id}`;
      await sendEmail({
        to: assignment.student.email,
        templateName: 'reminder',
        data: {
          studentName: assignment.student.name || 'student',
          teacherName: assignment.lesson.teacher.name || 'your teacher',
          lessonTitle: assignment.lesson.title,
          deadline: assignment.deadline.toLocaleDateString(),
          button: createButton('Complete Lesson', assignmentUrl, template.buttonColor || undefined),
        }
      });
      await prisma.assignment.update({
        where: { id: assignment.id },
        data: { reminderSentAt: new Date() },
      });
    }
  }
  return { success: true, message: `Sent ${assignments.length} reminders.` };
}


export async function sendStartDateNotifications() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const assignmentsToNotify = await prisma.assignment.findMany({
      where: {
          status: AssignmentStatus.PENDING,
          notifyOnStartDate: true,
          startDate: {
              gte: today,
              lt: tomorrow,
          },
      },
      include: {
          student: true,
          lesson: {
              include: { teacher: true },
          },
      },
  });

  if (assignmentsToNotify.length === 0) {
      return { success: true, message: "No start date notifications to send." };
  }

  const template = await getEmailTemplateByName('new_assignment');
  if (!template) {
      console.error("New assignment email template not found.");
      return { success: false, message: "New assignment email template not found." };
  }

  let count = 0;
  for (const assignment of assignmentsToNotify) {
      if (assignment.student.email && assignment.lesson.teacher) {
          const assignmentUrl = `${process.env.AUTH_URL}/my-lessons`;
          await sendEmail({
              to: assignment.student.email,
              templateName: 'new_assignment',
              data: {
                  studentName: assignment.student.name || 'student',
                  teacherName: assignment.lesson.teacher.name || 'Your Teacher',
                  lessonTitle: assignment.lesson.title,
                  button: createButton('Start Lesson', assignmentUrl, template.buttonColor || undefined),
              },
          });
          count++;
      }
  }
  return { success: true, message: `Sent ${count} start date notifications.` };
}

export async function sendCronTestEmail() {
    const session = await auth();
    if (session?.user?.email && session.user.role === Role.ADMIN) {
        try {
            await sendEmail({
                to: session.user.email,
                templateName: "custom",
                data: {}, // Added empty data object to satisfy the type
                override: {
                    subject: "Cron Job Test",
                    body: `This is a test email triggered by the cron job test page at ${new Date().toLocaleString()}.`,
                }
            });
            return { success: true, message: `Test email sent to ${session.user.email}.` };
        } catch (error) {
            console.error("Failed to send cron test email:", error);
            return { success: false, message: "Failed to send test email." };
        }
    }
    return { success: false, message: "No authorized user to send test email to." };
}