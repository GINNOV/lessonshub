// file: src/actions/cronActions.tsx
'use server';

import prisma from "@/lib/prisma";
import { AssignmentStatus, Role } from "@prisma/client";
import { getEmailTemplateByName } from '@/actions/adminActions';
import { createButton, defaultEmailTemplates, sendEmail } from '@/lib/email-templates';
import { auth } from "@/auth";
import { hasAdminPrivileges } from "@/lib/authz";
import { convertExtraPointsToEuro } from "@/lib/points";

export async function failExpiredAssignments(graceHours: number = 24) {
  try {
    const now = new Date();
    const warningWindowStart = new Date(now.getTime() - graceHours * 60 * 60 * 1000);
    const warningCandidates = await prisma.assignment.findMany({
      where: {
        status: AssignmentStatus.PENDING,
        deadline: { lte: now, gt: warningWindowStart },
        pastDueWarningSentAt: null,
      },
      include: {
        student: true,
        lesson: { include: { teacher: true } },
      },
    });

    if (warningCandidates.length > 0) {
      const template =
        (await getEmailTemplateByName('past_due_warning')) ??
        defaultEmailTemplates.past_due_warning;

      for (const assignment of warningCandidates) {
        if (!assignment.student?.email || !assignment.lesson?.teacher) continue;
        const failAt = new Date(assignment.deadline.getTime() + graceHours * 60 * 60 * 1000);
        const hoursLeft = Math.max(1, Math.round((failAt.getTime() - now.getTime()) / (60 * 60 * 1000)));
        const formatCEST = (date: Date) => {
          try {
            return new Intl.DateTimeFormat('en-GB', {
              timeZone: 'Europe/Berlin',
              dateStyle: 'medium',
              timeStyle: 'short',
            }).format(date) + ' (CEST)';
          } catch {
            return `${date.toLocaleString()} CEST`;
          }
        };

        const assignmentUrl = `${process.env.AUTH_URL}/assignments/${assignment.id}`;
        await sendEmail({
          to: assignment.student.email,
          templateName: 'past_due_warning',
          data: {
            studentName: assignment.student.name || 'student',
            lessonTitle: assignment.lesson.title,
            deadline: formatCEST(new Date(assignment.deadline)),
            failAt: formatCEST(failAt),
            hoursLeft: String(hoursLeft),
            button: createButton('Request Extension', assignmentUrl, template.buttonColor || undefined),
          },
        });
      }

      const warnedIds = warningCandidates.map((a) => a.id);
      if (warnedIds.length > 0) {
        await prisma.assignment.updateMany({
          where: { id: { in: warnedIds } },
          data: { pastDueWarningSentAt: new Date() },
        });
      }
    }

    const cutoff = new Date(now.getTime() - graceHours * 60 * 60 * 1000);
    const expired = await prisma.assignment.findMany({
      where: {
        status: AssignmentStatus.PENDING,
        deadline: { lt: cutoff },
      },
      select: { id: true },
    });

    if (expired.length === 0) {
      return { success: true, failedCount: 0, message: "No expired assignments to fail." };
    }

    const ids = expired.map(a => a.id);
    await prisma.assignment.updateMany({
      where: { id: { in: ids } },
      data: { status: AssignmentStatus.FAILED },
    });

    return { success: true, failedCount: ids.length };
  } catch (error) {
    console.error("FAIL_EXPIRED_ASSIGNMENTS_ERROR", error);
    return { success: false, message: "Failed to fail expired assignments." };
  }
}

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
          const tz = assignment.student.timeZone || undefined;
          let deadlineStr: string;
          try {
            deadlineStr = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: tz }).format(new Date(assignment.deadline));
          } catch {
            deadlineStr = new Date(assignment.deadline).toLocaleString();
          }
          await sendEmail({
            to: assignment.student.email,
            templateName: 'reminder',
            data: {
              studentName: assignment.student.name || 'student',
              teacherName: assignment.lesson.teacher.name || 'your teacher',
              lessonTitle: assignment.lesson.title,
              deadline: deadlineStr,
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


export async function sendStartDateNotifications(referenceDate?: Date, lookaheadMinutes: number = 60) {
  const now = referenceDate ?? new Date();
  const windowEnd = new Date(now.getTime() + lookaheadMinutes * 60 * 1000);

  const assignmentsToNotify = await prisma.assignment.findMany({
    where: {
      status: AssignmentStatus.PENDING,
      notifyOnStartDate: true,
      startDate: { lte: windowEnd },
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
  const notifiedIds: string[] = [];
  for (const assignment of assignmentsToNotify) {
    if (assignment.student.email && assignment.lesson.teacher) {
      const assignmentUrl = `${process.env.AUTH_URL}/my-lessons`;
      const tz = assignment.student.timeZone || undefined;
      let deadlineStr: string;
      try {
        deadlineStr = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: tz }).format(new Date(assignment.deadline));
      } catch {
        deadlineStr = new Date(assignment.deadline).toLocaleString();
      }
      await sendEmail({
        to: assignment.student.email,
        templateName: 'new_assignment',
        data: {
          studentName: assignment.student.name || 'student',
          teacherName: assignment.lesson.teacher.name || 'Your Teacher',
          lessonTitle: assignment.lesson.title,
          deadline: deadlineStr,
          button: createButton('Start Lesson', assignmentUrl, template.buttonColor || undefined),
        },
      });
      notifiedIds.push(assignment.id);
      count++;
    }
  }

  if (notifiedIds.length > 0) {
    await prisma.assignment.updateMany({
      where: { id: { in: notifiedIds } },
      data: { notifyOnStartDate: false },
    });
  }

  return { success: true, message: `Sent ${count} start date notifications.` };
}

export async function sendCronTestEmail() {
    const session = await auth();
    if (session?.user?.email && hasAdminPrivileges(session.user)) {
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

export async function sendPaymentReminders() {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  // Find all paying users who haven't received a reminder this month
  const usersToNotify = await prisma.user.findMany({
    where: {
      isPaying: true,
      OR: [
        { lastPaymentReminderSentAt: null },
        { lastPaymentReminderSentAt: { lt: startOfMonth } },
      ],
    },
  });

  if (usersToNotify.length === 0) {
    return { success: true, message: "No payment reminders to send." };
  }

  const template = await getEmailTemplateByName('payment_reminder');
  if (!template) {
    console.error("Payment reminder email template not found.");
    return { success: false, message: "Payment reminder email template not found." };
  }

  let count = 0;
  for (const user of usersToNotify) {
    if (user.email) {
      const paymentUrl = `${process.env.AUTH_URL}/payment`;
      await sendEmail({
        to: user.email,
        templateName: 'payment_reminder',
        data: {
          userName: user.name || 'student',
          button: createButton('Go to Payment Page', paymentUrl, template.buttonColor || undefined),
        },
      });

      await prisma.user.update({
        where: { id: user.id },
        data: { lastPaymentReminderSentAt: new Date() },
      });
      count++;
    }
  }

  return { success: true, message: `Sent ${count} payment reminders.` };
}


export async function sendWeeklySummaries(options: { referenceDate?: Date; force?: boolean } = {}) {
  const today = options.referenceDate ?? new Date();
  if (!options.force && today.getDay() != 0) {
    return { success: true, message: 'Not Sunday — skipping weekly summaries.' };
  }
  const end = new Date(today); end.setHours(23,59,59,999);
  const start = new Date(end); start.setDate(end.getDate()-6); start.setHours(0,0,0,0);

  const students = await (await import('@/lib/prisma')).default.user.findMany({
    where: { role: (await import('@prisma/client')).Role.STUDENT, isSuspended: false, isTakingBreak: false, weeklySummaryOptOut: false },
    select: { id: true, name: true, email: true, timeZone: true },
  });

  const template = await (await import('@/actions/adminActions')).getEmailTemplateByName('weekly_summary');
  if (!template) {
    console.error('weekly_summary email template not found.');
    return { success: false, message: 'weekly_summary template missing' };
  }

  const quotes = [
    { text: 'Learning never exhausts the mind.', author: 'Leonardo da Vinci' },
    { text: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
    { text: 'Small progress is still progress.', author: 'Unknown' },
    { text: 'The beautiful thing about learning is nobody can take it away from you.', author: 'B.B. King' },
  ];
  const fmtCurrency = (n:number)=> n.toFixed(2)
  const fmtRange = (tz?: string) => { try { const f=new Intl.DateTimeFormat(undefined,{dateStyle:'medium', timeZone:tz}); return f.format(start)+' – '+f.format(end);} catch { return start.toLocaleDateString()+' – '+end.toLocaleDateString(); } }

  let sent=0
  for (const s of students) {
    if (!s.email) continue
    const weekAssignments = await (await import('@/lib/prisma')).default.assignment.findMany({
      where: {
        studentId: s.id,
        OR: [ { gradedAt: { gte: start, lte: end } }, { assignedAt: { gte: start, lte: end } } ],
        status: { in: [ (await import('@prisma/client')).AssignmentStatus.COMPLETED, (await import('@prisma/client')).AssignmentStatus.GRADED, (await import('@prisma/client')).AssignmentStatus.FAILED ] },
      },
      include: { lesson: { select: { title: true, price: true } } },
      orderBy: { gradedAt: 'asc' },
    })
    const { AssignmentStatus } = await import('@prisma/client')
    const gradedCount = weekAssignments.filter(a=>a.status===AssignmentStatus.GRADED).length
    const failedCount = weekAssignments.filter(a=>a.status===AssignmentStatus.FAILED).length
    let savingsWeek=0
    for (const a of weekAssignments){ const price=a.lesson?.price? Number(a.lesson.price.toString()):0; if (a.status===AssignmentStatus.FAILED) savingsWeek-=price; else if (a.status===AssignmentStatus.GRADED && (a.score??0)>=0) { savingsWeek+=price; } if (a.status===AssignmentStatus.GRADED && a.extraPoints) savingsWeek+=convertExtraPointsToEuro(a.extraPoints); }

    const allResults = await (await import('@/lib/prisma')).default.assignment.findMany({
      where: { studentId: s.id, status: { in: [AssignmentStatus.GRADED, AssignmentStatus.FAILED] } },
      include: { lesson: { select: { price: true } } },
    })
    let savingsTotal=0
    for (const a of allResults){ const price=a.lesson?.price? Number(a.lesson.price.toString()):0; if (a.status===AssignmentStatus.FAILED) savingsTotal-=price; else if ((a.score??0)>=0) { savingsTotal+=price; } if (a.status===AssignmentStatus.GRADED && a.extraPoints) savingsTotal+=convertExtraPointsToEuro(a.extraPoints); }

    const itemsHtml = weekAssignments.length ? '<ul style="padding-left:18px;color:#1d1c1d;">'+weekAssignments.map(a=>`<li style="margin:6px 0;">${a.lesson?.title||'Lesson'} — <strong>${a.status}</strong>${a.status==='GRADED'&&a.score!==null?` (score: ${a.score}/10)`:''}</li>`).join('')+'</ul>' : '<p style="color:#8898aa;">No graded activity this week — a fresh start awaits! 💪</p>'
    const encouragement = gradedCount>=3 ? 'Fantastic week! Your consistency is building real momentum.' : gradedCount>=1 ? 'Great job — keep that rhythm going into next week!' : 'New week, new start. Even one lesson makes a difference!'
    const quote = quotes[Math.floor(Math.random()*quotes.length)]

    const { createButton, sendEmail } = await import('@/lib/email-templates')
    const button = createButton('Go to My Lessons', `${process.env.AUTH_URL}/my-lessons`, template.buttonColor || undefined)

    await sendEmail({
      to: s.email,
      templateName: 'weekly_summary',
      data: {
        studentName: s.name || 'student',
        weekRange: fmtRange(s.timeZone || undefined),
        gradedCount: String(gradedCount),
        failedCount: String(failedCount),
        savingsWeek: fmtCurrency(savingsWeek),
        savingsTotal: fmtCurrency(savingsTotal),
        lessonList: itemsHtml,
        encouragement,
        quoteText: quote.text,
        quoteAuthor: quote.author,
        button,
      }
    })
    sent++
  }
  return { success: true, message: `Sent ${sent} weekly summaries.` }
}
