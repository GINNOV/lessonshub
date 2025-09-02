// file: src/app/api/cron/deadline-reminders/route.tsx

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { render } from '@react-email/render';
import DeadlineReminderEmail from '@/emails/DeadlineReminderEmail';
import { AssignmentStatus } from '@prisma/client';

export async function GET(request: Request) {
  // Simple security: check for a secret key in the request URL
  const { searchParams } = new URL(request.url);
  const cronSecret = searchParams.get('secret');

  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const upcomingAssignments = await prisma.assignment.findMany({
      where: {
        deadline: {
          gte: now,
          lte: twentyFourHoursFromNow,
        },
        status: AssignmentStatus.PENDING, // Only remind for pending assignments
      },
      include: {
        student: true,
        lesson: true,
      },
    });

    if (upcomingAssignments.length === 0) {
      return NextResponse.json({ message: 'No upcoming deadlines.' });
    }
    
    const emailPromises = upcomingAssignments.map(async (assignment) => {
      if (assignment.student.email) {
        const assignmentUrl = `${new URL(request.url).origin}/assignments/${assignment.id}`;
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

    return NextResponse.json({ message: `Sent ${upcomingAssignments.length} deadline reminders.` });

  } catch (error) {
    console.error("CRON_JOB_ERROR", error);
    return NextResponse.json({ error: 'Failed to process reminders' }, { status: 500 });
  }
}