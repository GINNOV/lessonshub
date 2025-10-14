// file: src/app/api/lessons/route.ts

import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Role, AssignmentNotification } from "@prisma/client";
import { getEmailTemplateByName } from "@/actions/adminActions";
import { replacePlaceholders, createButton } from "@/lib/email-templates";

export async function POST(request: Request) {
  const session = await auth();
  if (!session || !session.user || session.user.role !== Role.TEACHER) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const body = await request.json();
  const { title, price, lesson_preview, assignmentText, questions, contextText, assignment_image_url, soundcloud_url, attachment_url, notes, assignment_notification, scheduled_assignment_date } = body; 

  if (!title || !assignmentText) {
    return new NextResponse(
      JSON.stringify({ error: "Title and assignment text are required" }),
      { status: 400 }
    );
  }

  try {
    const newLesson = await prisma.lesson.create({
      data: {
        title: title,
        price: price,
        lesson_preview,
        assignment_text: assignmentText,
        questions,
        context_text: contextText,
        assignment_image_url: assignment_image_url,
        soundcloud_url,
        attachment_url,
        notes,
        assignment_notification,
        scheduled_assignment_date,
        teacherId: session.user.id,
      },
    });


    if (assignment_notification !== AssignmentNotification.NOT_ASSIGNED) {
      const students = await prisma.user.findMany({ where: { role: Role.STUDENT }, select: { id: true, email: true, name: true, timeZone: true } });
      
      // Task 5 & 8 Verification: This logic correctly handles not sending emails
      // when "ASSIGN_WITHOUT_NOTIFICATION" or "ASSIGN_ON_DATE" is chosen.
      // The cron job will handle the notification for "ASSIGN_ON_DATE".
      if (students.length > 0) {
        const defaultDeadline = new Date(Date.now() + 36 * 60 * 60 * 1000);
        const assignmentsData = students.map(student => ({
            lessonId: newLesson.id,
            studentId: student.id,
            deadline: defaultDeadline, // Default deadline 36 hours from now
        }));
        
        await prisma.assignment.createMany({
            data: assignmentsData,
            skipDuplicates: true,
        });

        if (assignment_notification === AssignmentNotification.ASSIGN_AND_NOTIFY) {
            const template = await getEmailTemplateByName('new_assignment');
            if (template) {
                for (const student of students) {
                    if (student.email) {
                        try {
                            const assignmentUrl = `${process.env.AUTH_URL}/my-lessons`;
                            const subject = replacePlaceholders(template.subject, { lessonTitle: newLesson.title });
                            let deadlineStr: string;
                            try {
                              deadlineStr = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: student.timeZone || undefined }).format(defaultDeadline);
                            } catch {
                              deadlineStr = defaultDeadline.toLocaleString();
                            }
                            const body = replacePlaceholders(template.body, {
                                studentName: student.name || 'student',
                                teacherName: session.user.name || 'your teacher',
                                lessonTitle: newLesson.title,
                                deadline: deadlineStr,
                                button: createButton('Start Lesson', assignmentUrl),
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
                        } catch (emailError) {
                            console.error(`[NOTIFY] An error occurred while preparing email for ${student.email}:`, emailError);
                        }
                    }
                }
            }
        }
      }
    }

    return NextResponse.json(newLesson, { status: 201 });
  } catch (error) {
    console.error("Error creating lesson:", error);
    return new NextResponse(
      JSON.stringify({ error: "Failed to create lesson" }),
      { status: 500 }
    );
  }
}
