// file: src/app/api/cron/daily/route.tsx

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { render } from '@react-email/render';
import DeadlineReminderEmail from '@/emails/DeadlineReminderEmail';
import NewAssignmentEmail from '@/emails/NewAssignmentEmail';
import { AssignmentStatus, AssignmentNotification, Role } from '@prisma/client';

async function handleScheduledAssignments() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const lessonsToAssign = await prisma.lesson.findMany({
    where: {
      assignment_notification: AssignmentNotification.ASSIGN_ON_DATE,
      scheduled_assignment_date: {
        gte: today,
        lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
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
  
  for (const lesson of lessonsToAssign) {
    const assignmentsData = students.map(student => ({
      lessonId: lesson.id,
      studentId: student.id,
      deadline: new Date(Date.now() + 36 * 60 * 60 * 1000),
    }));

    await prisma.assignment.createMany({ data: assignmentsData, skipDuplicates: true });

    for (const student of students) {
        if (student.email) {
            const assignmentUrl = `${process.env.AUTH_URL}/my-lessons`;
            const emailHtml = await render(
                NewAssignmentEmail({
                    studentName: student.name,
                    lessonTitle: lesson.title,
                    teacherName: lesson.teacher.name,
                    deadline: new Date(Date.now() + 36 * 60 * 60 * 1000),
                    assignmentUrl,
                })
            );
            
            await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    from: process.env.EMAIL_FROM,
                    to: student.email,
                    subject: `New Assignment: ${lesson.title}`,
                    html: emailHtml,
                }),
            });
        }
    }

    await prisma.lesson.update({
      where: { id: lesson.id },
      data: { assignment_notification: AssignmentNotification.ASSIGN_WITHOUT_NOTIFICATION },
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
  
  const emailPromises = upcomingAssignments.map(async (assignment) => {
    if (assignment.student.email) {
      const assignmentUrl = `${new URL(requestUrl).origin}/assignments/${assignment.id}`;
      const emailHtml = await render(
        <DeadlineReminderEmail
          studentName={assignment.student.name}
          lessonTitle={assignment.lesson.title}
          deadline={assignment.deadline}
          assignmentUrl={assignmentUrl}
        />
      );

      return fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM,
          to: assignment.student.email,
          subject: `🔔 Reminder: Assignment "${assignment.lesson.title}" is due soon`,
          html: emailHtml,
        }),
      });
    }
  });

  await Promise.all(emailPromises);
  return upcomingAssignments.length;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cronSecret = searchParams.get('secret');

  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const assignedCount = await handleScheduledAssignments();
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