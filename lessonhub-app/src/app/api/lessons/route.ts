// file: src/app/api/lessons/route.ts

import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || session.user.role !== Role.TEACHER) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const body = await request.json();
  // Ensure 'assignment_image_url' is destructured here
  const { title, assignmentText, contextText, assignment_image_url } = body; 

  if (!title || !assignmentText) {
    return new NextResponse(
      JSON.stringify({ error: "Title and assignment text are required" }),
      { status: 400 }
    );
  }

  try {
    const newLesson = await prisma.lesson.create({
      data: {
        title: title,
        assignment_text: assignmentText,
        context_text: contextText,
        assignment_image_url: assignment_image_url,
        teacherId: session.user.id,
      },
    });

    return NextResponse.json(newLesson, { status: 201 });
  } catch (error) {
    console.error("Error creating lesson:", error);
    return new NextResponse(
      JSON.stringify({ error: "Failed to create lesson" }),
      { status: 500 }
    );
  }
}