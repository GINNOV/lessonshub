// file: src/app/api/assignments/[assignmentId]/grade/route.tsx

export const runtime = 'nodejs';

import { auth } from "@/auth";
import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { Role, AssignmentStatus } from "@prisma/client";
import { render } from '@react-email/render';
import * as React from 'react';
import * as fs from 'fs';
import * as path from 'path';

// Dynamically import the email component to prevent build-time resolution issues
const GradedEmail = (await import('@/emails/GradedEmail')).default;


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

    // Send email notification
    if (assignment.student.email) {
      const assignmentUrl = `${getBaseUrl(request)}/assignments/${assignment.id}`;
      
      const emailHtml = render(
        React.createElement(GradedEmail, {
          studentName: assignment.student.name,
          lessonTitle: assignment.lesson.title,
          score: score,
          teacherComments: teacherComments,
          assignmentUrl: assignmentUrl,
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
          to: assignment.student.email,
          subject: `Your assignment "${assignment.lesson.title}" has been graded`,
          html: emailHtml,
        }),
      });
    }

    return NextResponse.json(updatedAssignment, { status: 200 });
  } catch (error) {
    console.error("GRADE_SUBMISSION_ERROR", error);
    return new NextResponse(JSON.stringify({ error: "Failed to submit grade" }), { status: 500 });
  }
}