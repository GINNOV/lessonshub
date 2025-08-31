// file: src/app/api/assignments/[assignmentId]/grade/route.ts

export const runtime = 'nodejs';

import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function POST(request: Request) {
  const session = await auth();
  
  if (!session || !session.user || session.user.role !== Role.TEACHER) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  try {
    const body = await request.json();
    const { lessonId, studentIds, deadline } = body;

    if (!lessonId || !studentIds || !Array.isArray(studentIds) || studentIds.length === 0 || !deadline) {
      return new NextResponse(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    const assignmentsData = studentIds.map((studentId: string) => ({
      lessonId: lessonId,
      studentId: studentId,
      deadline: new Date(deadline),
    }));

    const result = await prisma.assignment.createMany({
      data: assignmentsData,
      skipDuplicates: true,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("ASSIGNMENT_ERROR", error);
    return new NextResponse(JSON.stringify({ error: "Failed to create assignments" }), { status: 500 });
  }
}
