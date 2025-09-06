// file: src/app/api/cron/daily/route.tsx

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getEmailTemplateByName } from "@/actions/adminActions";
import { replacePlaceholders, createButton } from "@/lib/email-templates";
import { AssignmentStatus, AssignmentNotification, Role } from '@prisma/client';

async function handleScheduledAssignments(requestUrl: string) {
  const now = new Date();

  const lessonsToAssign = await prisma.lesson.findMany({
    where: {
      assignment_notification: AssignmentNotification.ASSIGN_ON_DATE,
      scheduled_assignment_date: {
        lte: now, // Find all lessons scheduled for now or in the past
      },
    },
    include: {
        teacher: true,
    }
  });

  if (lessonsToAssign.length === 0) {
    console.log('[CRON] No lessons to assign today.');
    return 0;
  }

  const students = await prisma.user.findMany({ where: { role: Role.STUDENT } });
  if (students.length === 0) {
    console.log('[CRON] No students found to assign lessons to.');
    return 0;
  }
  
  const template = await getEmailTemplateByName('new_assignment');
  if (!template) {
    console.error('[CRON] "new_assignment" email template not found.');
    return 0;
  }

  for (const lesson of lessonsToAssign) {
    const deadline = new Date(Date.now() + 36 * 60 * 60 * 1000);
    const assignmentsData = students.map(student => ({
      lessonId: lesson.id,
      studentId: student.id,
      deadline,
    }));

    await prisma.assignment.createMany({ data: assignmentsData, skipDuplicates: true });

    for (const student of students) {
        if (student.email) {
            const assignmentUrl = `${new URL(requestUrl).origin}/my-lessons`;
            const subject = replacePlaceholders(template.subject, { lessonTitle: lesson.title });
            const body = replacePlaceholders(template.body, {
                studentName: student.name || 'student',
                teacherName: lesson.teacher.name || 'your teacher',
                lessonTitle: lesson.title,
                deadline: deadline.toLocaleString(),
                button: createButton('Start Lesson', assignmentUrl, template.buttonColor || undefined),
            });
            
            await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    from: process.env.EMAIL_FROM,
                    to: student.email,
                    subject,
                    html: body,
                }),
            });
        }
    }

    // Update the lesson to prevent it from being assigned again
    await prisma.lesson.update({
      where: { id: lesson.id },
      data: { 
          assignment_notification: AssignmentNotification.ASSIGN_WITHOUT_NOTIFICATION,
          scheduled_assignment_date: null // Clear the date after assigning
        },
    });
  }

  return lessonsToAssign.length;
}

async function handleDeadlineReminders(requestUrl: string) {
  const now = new Date();
  const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const upcomingAssignments = await prisma.assignment.findMany({
    where: {
      deadline: {
        gte: now,
        lte: twentyFourHoursFromNow,
      },
      status: AssignmentStatus.PENDING,
    },
    include: {
      student: true,
      lesson: true,
    },
  });

  if (upcomingAssignments.length === 0) {
    console.log('[CRON] No upcoming deadlines to send reminders for.');
    return 0;
  }
  
  const template = await getEmailTemplateByName('deadline_reminder');
  if (!template) {
    console.error('[CRON] "deadline_reminder" email template not found.');
    return 0;
  }

  for (const assignment of upcomingAssignments) {
    if (assignment.student.email) {
      const assignmentUrl = `${new URL(requestUrl).origin}/assignments/${assignment.id}`;
      const subject = replacePlaceholders(template.subject, { lessonTitle: assignment.lesson.title });
      const body = replacePlaceholders(template.body, {
          studentName: assignment.student.name || 'student',
          lessonTitle: assignment.lesson.title,
          deadline: assignment.deadline.toLocaleString(),
          button: createButton('View Assignment', assignmentUrl, template.buttonColor || undefined),
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
  }

  return upcomingAssignments.length;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cronSecret = searchParams.get('secret');

  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const assignedCount = await handleScheduledAssignments(request.url);
    const remindedCount = await handleDeadlineReminders(request.url);
    
    return NextResponse.json({
      message: 'Cron job completed.',
      assigned: `${assignedCount} lessons assigned.`,
      reminded: `${remindedCount} deadline reminders sent.`,
    });

  } catch (error) {
    console.error("[CRON_JOB_ERROR]", error);
    return NextResponse.json({ error: 'Failed to process cron job' }, { status: 500 });
  }
}