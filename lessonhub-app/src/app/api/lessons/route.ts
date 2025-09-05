// file: src/app/api/lessons/route.ts

import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Role, AssignmentNotification } from "@prisma/client";
import NewAssignmentEmail from "@/emails/NewAssignmentEmail";
import { render } from "@react-email/render";

export async function POST(request: Request) {
  const session = await auth();
  if (!session || !session.user || session.user.role !== Role.TEACHER) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const body = await request.json();
  const { title, lesson_preview, assignmentText, questions, contextText, assignment_image_url, attachment_url, notes, assignment_notification, scheduled_assignment_date } = body; 

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
        lesson_preview,
        assignment_text: assignmentText,
        questions,
        context_text: contextText,
        assignment_image_url: assignment_image_url,
        attachment_url,
        notes,
        assignment_notification,
        scheduled_assignment_date,
        teacherId: session.user.id,
      },
    });

    // --- FIX: Assign to all students regardless of notification status ---
    if (assignment_notification !== AssignmentNotification.NOT_ASSIGNED) {
      const students = await prisma.user.findMany({ where: { role: Role.STUDENT } });
      const assignmentsData = students.map(student => ({
        lessonId: newLesson.id,
        studentId: student.id,
        deadline: new Date(Date.now() + 36 * 60 * 60 * 1000), // Default deadline 36 hours from now
      }));
      
      await prisma.assignment.createMany({
        data: assignmentsData,
        skipDuplicates: true,
      });

      // Handle immediate notifications
      if (assignment_notification === AssignmentNotification.ASSIGN_AND_NOTIFY) {
        console.log(`[NOTIFY] Preparing to send notifications for lesson ${newLesson.id} to ${students.length} students.`);
        for (const student of students) {
            if (student.email) {
                try {
                    const assignmentUrl = `${process.env.AUTH_URL}/my-lessons`;
                    const emailHtml = await render(
                        NewAssignmentEmail({
                            studentName: student.name,
                            lessonTitle: newLesson.title,
                            teacherName: session.user.name,
                            deadline: new Date(Date.now() + 36 * 60 * 60 * 1000),
                            assignmentUrl,
                        })
                    );
                    
                    const resendPayload = {
                        from: process.env.EMAIL_FROM,
                        to: student.email,
                        subject: `New Assignment: ${newLesson.title}`,
                        html: emailHtml,
                    };

                    console.log(`[NOTIFY] Sending email to ${student.email}`, resendPayload);

                    const emailResponse = await fetch("https://api.resend.com/emails", {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(resendPayload),
                    });

                    if (!emailResponse.ok) {
                        const errorBody = await emailResponse.json();
                        console.error(`[NOTIFY] Failed to send email to ${student.email}:`, errorBody);
                    }
                } catch (emailError) {
                    console.error(`[NOTIFY] An error occurred while preparing email for ${student.email}:`, emailError);
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