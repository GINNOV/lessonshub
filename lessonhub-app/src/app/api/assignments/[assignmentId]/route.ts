// file: src/app/api/assignments/[assignmentId]/route.ts
export const runtime = 'nodejs';

import { auth } from "@/auth";
import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";

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
  });

  if (!assignment) {
    return new NextResponse(JSON.stringify({ error: "Assignment not found or unauthorized" }), { status: 404 });
  }

  if (new Date() > new Date(assignment.deadline)) {
    return new NextResponse(JSON.stringify({ error: "The deadline for this assignment has passed." }), { status: 403 });
  }

  try {
    const body = await request.json();
    const { responseText } = body;

    const updatedAssignment = await prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        responseText: responseText,
        status: 'COMPLETED',
      },
    });

    return NextResponse.json(updatedAssignment, { status: 200 });
  } catch (error) {
    console.error("SUBMIT_RESPONSE_ERROR", error);
    return new NextResponse(JSON.stringify({ error: "Failed to submit response" }), { status: 500 });
  }
}
