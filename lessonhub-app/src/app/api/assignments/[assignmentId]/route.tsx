// file: src/app/api/assignments/[assignmentId]/route.tsx
export const runtime = 'nodejs';

import { auth } from "@/auth";
import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getEmailTemplateByName } from "@/actions/adminActions";
import { replacePlaceholders, createButton } from "@/lib/email-templates";

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
    const template = await getEmailTemplateByName('submission_notification');
    if (template && teacher && teacher.email) {
        try {
            const submissionUrl = `${getBaseUrl(request)}/dashboard/grade/${assignment.id}`;
            const subject = replacePlaceholders(template.subject, { studentName: session.user.name || 'A student', lessonTitle: assignment.lesson.title });
            const body = replacePlaceholders(template.body, {
                teacherName: teacher.name || 'teacher',
                studentName: session.user.name || 'A student',
                lessonTitle: assignment.lesson.title,
                button: createButton('View & Grade Submission', submissionUrl),
            });

            await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    from: process.env.EMAIL_FROM,
                    to: teacher.email,
                    subject,
                    html: body,
                }),
            });
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