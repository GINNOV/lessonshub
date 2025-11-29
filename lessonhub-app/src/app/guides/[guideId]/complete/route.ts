import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { LessonType, Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function POST(
  request: Request,
  { params }: { params: { guideId: string } }
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== Role.STUDENT) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const guideId = params.guideId;
  if (!guideId) {
    return NextResponse.json({ error: "Guide ID is required." }, { status: 400 });
  }

  const guide = await prisma.lesson.findFirst({
    where: { id: guideId, type: LessonType.LEARNING_SESSION },
    select: { id: true },
  });

  if (!guide) {
    return NextResponse.json({ error: "Guide not found." }, { status: 404 });
  }

  const existing = await prisma.guideCompletion.findUnique({
    where: {
      studentId_guideId: {
        studentId: session.user.id,
        guideId: guideId,
      },
    },
  });

  if (existing) {
    return NextResponse.json({ alreadyCompleted: true }, { status: 200 });
  }

  const POINTS_PER_GUIDE = 3;

  const [, updatedUser] = await prisma.$transaction([
    prisma.guideCompletion.create({
      data: {
        guideId,
        studentId: session.user.id,
      },
    }),
    prisma.user.update({
      where: { id: session.user.id },
      data: { readAlongPoints: { increment: POINTS_PER_GUIDE } },
      select: { readAlongPoints: true },
    }),
  ]);

  revalidatePath(`/guides/${guideId}`);
  revalidatePath("/my-lessons");

  return NextResponse.json({
    success: true,
    awarded: POINTS_PER_GUIDE,
    totalPoints: updatedUser.readAlongPoints,
  });
}
