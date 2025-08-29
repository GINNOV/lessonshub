// file: src/app/api/assignments/route.ts

import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function POST(request: Request) {
  // 1. Authenticate and authorize the user
  const session = await getServerSession(authOptions);
  if (!session || !session.user || session.user.role !== Role.TEACHER) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  try {
    // 2. Parse the request body
    const body = await request.json();
    const { lessonId, studentIds, deadline } = body;

    // 3. Validate the data
    if (!lessonId || !studentIds || !Array.isArray(studentIds) || studentIds.length === 0 || !deadline) {
      return new NextResponse(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    // 4. Prepare the data for bulk creation
    const assignmentsData = studentIds.map((studentId: string) => ({
      lessonId: lessonId,
      studentId: studentId,
      deadline: new Date(deadline),
    }));

    // 5. Use `createMany` for an efficient bulk insert
    const result = await prisma.assignment.createMany({
      data: assignmentsData,
      skipDuplicates: true, // Prevents errors if an assignment already exists
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("ASSIGNMENT_ERROR", error);
    return new NextResponse(JSON.stringify({ error: "Failed to create assignments" }), { status: 500 });
  }
}