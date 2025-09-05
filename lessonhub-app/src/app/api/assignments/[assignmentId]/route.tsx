// file: src/app/api/assignments/[assignmentId]/route.ts
export const runtime = 'nodejs';

import { auth } from "@/auth";
import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { render } from '@react-email/render';
import SubmissionNotificationEmail from '@/emails/SubmissionNotificationEmail';

function getBaseUrl(req: NextRequest): string {
  const headers = req.headers;
  const protocol = headers.get('x-forwarded-proto') || 'http';
  const host = headers.get('host') || 'localhost:3000';
  return `${protocol}://${host}`;
}


export async function PATCH(
  request: NextRequest,
  { params }: { params: { assignmentId: string } }
) {
  const session = await auth();
  const { assignmentId } = params; 

  if (!session?.user?.id) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const assignment = await prisma.assignment.findFirst({
    where: {
      id: assignmentId,
      studentId: session.user.id,
    },
    include: {
        lesson: {
            include: {
                teacher: true
            }
        }
    }
  });

  if (!assignment) {
    return new NextResponse(JSON.stringify({ error: "Assignment not found or unauthorized" }), { status: 404 });
  }

  if (new Date() > new Date(assignment.deadline)) {
    return new NextResponse(JSON.stringify({ error: "The deadline for this assignment has passed." }), { status: 403 });
  }

  try {
    const body = await request.json();
    const { answers, studentNotes } = body;

    const updatedAssignment = await prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        answers,
        studentNotes,
        status: 'COMPLETED',
      },
    });


    const teacher = assignment.lesson.teacher;
    if (teacher && teacher.email) {
        try {
            const submissionUrl = `${getBaseUrl(request)}/dashboard/grade/${assignment.id}`;
            const emailHtml = await render(
                <SubmissionNotificationEmail
                    teacherName={teacher.name}
                    studentName={session.user.name}
                    lessonTitle={assignment.lesson.title}
                    submissionUrl={submissionUrl}
                />
            );

            const emailResponse = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    from: process.env.EMAIL_FROM,
                    to: teacher.email,
                    subject: `New Submission: ${session.user.name} completed "${assignment.lesson.title}"`,
                    html: emailHtml,
                }),
            });

            if (emailResponse.ok) {
                console.log(`Successfully sent submission notification to ${teacher.email}`);
            } else {
                const errorBody = await emailResponse.json();
                console.error("Failed to send submission notification email:", errorBody);
            }
        } catch (emailError) {
            console.error("An unexpected error occurred while sending submission email:", emailError);
        }
    }

    return NextResponse.json(updatedAssignment, { status: 200 });
  } catch (error) {
    console.error("SUBMIT_RESPONSE_ERROR", error);
    return new NextResponse(JSON.stringify({ error: "Failed to submit response" }), { status: 500 });
  }
}