// file: src/app/api/assignments/[assignmentId]/grade/route.ts

export const runtime = 'nodejs';

import { auth } from "@/auth";
import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { Role, AssignmentStatus } from "@prisma/client";

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

    // Ensure the assignment exists and belongs to a lesson taught by this teacher.
    const assignment = await prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        lesson: {
          teacherId: session.user.id,
        },
      },
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

    return NextResponse.json(updatedAssignment, { status: 200 });
  } catch (error) {
    console.error("GRADE_SUBMISSION_ERROR", error);
    return new NextResponse(JSON.stringify({ error: "Failed to submit grade" }), { status: 500 });
  }
}