// file: src/app/api/assignments/[assignmentId]/grade/route.ts

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";

// This type now correctly reflects what Next.js 15 provides
interface RouteContext {
  params: Promise<{
    assignmentId: string;
  }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== Role.TEACHER) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  try {
    // Await the promise to get the actual params object
    const { assignmentId } = await context.params;
    const body = await request.json();
    const { score, teacherComments } = body;

    // Security check: ensure the teacher owns the lesson for this assignment
    const assignment = await prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        lesson: { teacherId: session.user.id },
      },
    });

    if (!assignment) {
      return new NextResponse(JSON.stringify({ error: "Assignment not found or you don't have permission to grade it." }), { status: 404 });
    }

    const updatedAssignment = await prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        score: Number(score),
        teacherComments,
        status: 'GRADED',
        gradedAt: new Date(),
      },
    });

    return NextResponse.json(updatedAssignment);
  } catch (error) {
    console.error("GRADING_ERROR", error);
    return new NextResponse(JSON.stringify({ error: "Failed to submit grade" }), { status: 500 });
  }
}