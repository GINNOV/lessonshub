// file: src/app/api/assignments/[assignmentId]/route.ts

import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
export async function PATCH(
  request: Request, 
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  // 1. Get session and assignment ID
  const session = await getServerSession(authOptions);
  const { assignmentId } = await params;

  // 2. Security: Find the assignment and ensure the logged-in user is the assigned student
  const assignment = await prisma.assignment.findFirst({
    where: {
      id: assignmentId,
      studentId: session?.user?.id, // Ensures a student can only update their own assignment
    },
  });

  if (!assignment) {
    return new NextResponse(JSON.stringify({ error: "Assignment not found or unauthorized" }), { status: 404 });
  }

  // 3. Logic: Check if the deadline has passed
  if (new Date() > new Date(assignment.deadline)) {
    return new NextResponse(JSON.stringify({ error: "The deadline for this assignment has passed." }), { status: 403 });
  }

  try {
    // 4. Get the response text from the request
    const body = await request.json();
    const { responseText } = body;

    // 5. Update the assignment in the database
    const updatedAssignment = await prisma.assignment.update({
      where: {
        id: assignmentId,
      },
      data: {
        responseText: responseText,
        status: 'COMPLETED', // Update the status
      },
    });

    return NextResponse.json(updatedAssignment, { status: 200 });
  } catch (error) {
    console.error("SUBMIT_RESPONSE_ERROR", error);
    return new NextResponse(JSON.stringify({ error: "Failed to submit response" }), { status: 500 });
  }
}