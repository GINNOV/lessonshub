// file: src/app/api/assignments/route.ts
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function PATCH(request: Request) {
  const session = await auth();

  if (!session || !session.user || session.user.role !== Role.TEACHER) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  try {
    const body = await request.json();
    const { lessonId, studentIdsToAssign, studentIdsToUnassign, deadline } = body;

    if (!lessonId || !deadline) {
      return new NextResponse(JSON.stringify({ error: "Lesson ID and deadline are required" }), { status: 400 });
    }

    const operations = [];

    // 1. Unassign students who were deselected
    if (studentIdsToUnassign && studentIdsToUnassign.length > 0) {
      const deleteOperation = prisma.assignment.deleteMany({
        where: {
          lessonId: lessonId,
          studentId: {
            in: studentIdsToUnassign,
          },
        },
      });
      operations.push(deleteOperation);
    }

    // 2. Assign new students who were selected
    if (studentIdsToAssign && studentIdsToAssign.length > 0) {
      const assignmentsData = studentIdsToAssign.map((studentId: string) => ({
        lessonId: lessonId,
        studentId: studentId,
        deadline: new Date(deadline),
      }));
      const createOperation = prisma.assignment.createMany({
        data: assignmentsData,
        skipDuplicates: true, // This is a safeguard
      });
      operations.push(createOperation);
    }
    
    // 3. Execute all operations in a single transaction
    if (operations.length > 0) {
      await prisma.$transaction(operations);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("ASSIGNMENT_UPDATE_ERROR", error);
    return new NextResponse(JSON.stringify({ error: "Failed to update assignments" }), { status: 500 });
  }
}