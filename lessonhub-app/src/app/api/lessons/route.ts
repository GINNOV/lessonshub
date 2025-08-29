// file: src/app/api/lessons/route.ts

import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client"; // Import the Role enum

export async function POST(request: Request) {
  // 1. Update the security check here
  const session = await getServerSession(authOptions);
  if (!session || !session.user || session.user.role !== Role.TEACHER) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  // 2. Parse the request body
  const body = await request.json();
  const { title, assignmentText, contextText } = body;

  // 3. Validate the data
  if (!title || !assignmentText) {
    return new NextResponse(
      JSON.stringify({ error: "Title and assignment text are required" }),
      { status: 400 }
    );
  }

  try {
    // 4. Create the lesson in the database
    const newLesson = await prisma.lesson.create({
      data: {
        title: title,
        assignment_text: assignmentText,
        context_text: contextText,
        teacherId: session.user.id,
      },
    });

    // 5. Return the new lesson
    return NextResponse.json(newLesson, { status: 201 });
  } catch (error) {
    console.error("Error creating lesson:", error);
    return new NextResponse(
      JSON.stringify({ error: "Failed to create lesson" }),
      { status: 500 }
    );
  }
}