// file: src/app/api/lessons/route.ts

import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma"; // <--- CHANGE THIS LINE

// const prisma = new PrismaClient(); <--- DELETE THIS LINE

export async function POST(request: Request) {
  // ... the rest of your code remains exactly the same
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const body = await request.json();
  const { title, assignmentText, contextText } = body;

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