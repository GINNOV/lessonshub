// file: src/app/api/cron/daily/route.tsx
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { AssignmentStatus } from '@prisma/client';
import { getEmailTemplateByName } from '@/actions/adminActions';
import { replacePlaceholders, createButton, sendEmail } from '@/lib/email-templates';

export async function GET() {
    console.log("Daily deadline reminder cron job started.");

    try {
        const now = new Date();
        const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const fortyEightHoursFromNow = new Date(now.getTime() + 48 * 60 * 60 * 1000);

        const assignments = await prisma.assignment.findMany({
            where: {
                status: AssignmentStatus.PENDING,
                deadline: {
                    gte: twentyFourHoursFromNow,
                    lt: fortyEightHoursFromNow,
                },
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

        console.log(`Found ${assignments.length} assignments with deadlines approaching.`);
        if (assignments.length === 0) {
            return NextResponse.json({ message: 'No assignments with approaching deadlines.' });
        }
        
        const template = await getEmailTemplateByName('deadline_reminder');
        if (!template) {
            console.error('Deadline reminder email template not found.');
            return NextResponse.json({ error: 'Deadline reminder email template not found.' }, { status: 500 });
        }

        for (const assignment of assignments) {
            const { student, lesson, deadline } = assignment;

            // ✅ THIS IS THE FIX: Only proceed if the student has an email AND the lesson has a teacher.
            if (student.email && lesson.teacher) {
                try {
                    const assignmentUrl = `${process.env.AUTH_URL}/assignments/${assignment.id}`;
                    await sendEmail({
                        to: student.email,
                        templateName: 'deadline_reminder',
                        data: {
                            studentName: student.name || 'student',
                            teacherName: lesson.teacher.name || 'your teacher',
                            lessonTitle: lesson.title,
                            deadline: new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(deadline)),
                            button: createButton('Start Lesson', assignmentUrl),
                        }
                    });
                    console.log(`Sent deadline reminder to ${student.email} for lesson "${lesson.title}".`);
                } catch (emailError) {
                    console.error(`Failed to send email to ${student.email}:`, emailError);
                }
            } else {
                if (!lesson.teacher) {
                    console.log(`Skipping assignment ${assignment.id} for lesson "${lesson.title}" because it has no teacher.`);
                }
            }
        }

        return NextResponse.json({ message: 'Daily deadline reminders processed successfully.' });
    } catch (error) {
        console.error("An unexpected error occurred in the daily cron job:", error);
        return new NextResponse('An unexpected error occurred.', { status: 500 });
    }
}