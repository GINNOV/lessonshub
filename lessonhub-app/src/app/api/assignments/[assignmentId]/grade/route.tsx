// file: src/app/api/assignments/[assignmentId]/grade/route.tsx

export const runtime = 'nodejs';

import { auth } from "@/auth";
import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { Role, AssignmentStatus } from "@prisma/client";
import { getEmailTemplateByName } from "@/actions/adminActions";
import { replacePlaceholders, createButton } from "@/lib/email-templates";

// Helper function to get base URL
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

  if (!session?.user?.id || session.user.role !== Role.TEACHER) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  try {
    const body = await request.json();
    const { score, teacherComments } = body;

    if (typeof score !== 'number') {
      return new NextResponse(JSON.stringify({ error: "Score is required and must be a number" }), { status: 400 });
    }

    const assignment = await prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        lesson: {
          teacherId: session.user.id,
        },
      },
      include: {
        student: true,
        lesson: true,
      }
    });

    if (!assignment) {
      return new NextResponse(JSON.stringify({ error: "Assignment not found or you don't have permission to grade it." }), { status: 404 });
    }

    const updatedAssignment = await prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        score,
        teacherComments,
        status: AssignmentStatus.GRADED,
        gradedAt: new Date(),
      },
    });

    const template = await getEmailTemplateByName('graded');
    if (template && assignment.student?.email) {
      try {
        const assignmentUrl = `${getBaseUrl(request)}/assignments/${assignment.id}`;
        
        const subject = replacePlaceholders(template.subject, { lessonTitle: assignment.lesson.title });
        const body = replacePlaceholders(template.body, {
            studentName: assignment.student.name || 'student',
            lessonTitle: assignment.lesson.title,
            score: score.toString(),
            teacherComments: teacherComments ? `<p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;"><strong>Teacher's Feedback:</strong><br/><em>&quot;${teacherComments}&quot;</em></p>` : '',
            button: createButton('View Your Grade', assignmentUrl),
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
      } catch (emailError) {
        console.error("An unexpected error occurred while sending the email:", emailError);
      }
    }

    return NextResponse.json(updatedAssignment, { status: 200 });
  } catch (error) {
    console.error("GRADE_SUBMISSION_ERROR", error);
    return new NextResponse(JSON.stringify({ error: "Failed to submit grade" }), { status: 500 });
  }
}