export const runtime = 'nodejs';

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { AssignmentStatus, Prisma, Role } from "@prisma/client";
import { NextResponse } from "next/server";

const isNumberLike = (value: unknown): value is number => {
  if (typeof value === 'number' && Number.isFinite(value)) return true;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed);
  }
  return false;
};

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== Role.STUDENT) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { lessonId, answers, scorePercent, timeTakenSeconds } = body ?? {};

    if (!lessonId || typeof lessonId !== 'string') {
      return NextResponse.json({ error: "Lesson ID is required." }, { status: 400 });
    }

    const assignment = await prisma.assignment.findFirst({
      where: {
        lessonId,
        studentId: session.user.id,
      },
      include: {
        lesson: {
          select: {
            type: true,
          },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found for this lesson." }, { status: 404 });
    }

    const scoreValue = isNumberLike(scorePercent) ? Math.round(Number(scorePercent)) : null;
    const timeValue = isNumberLike(timeTakenSeconds) ? Math.max(0, Math.round(Number(timeTakenSeconds))) : null;

    const attempt = await prisma.lyricLessonAttempt.create({
      data: {
        lessonId,
        studentId: session.user.id,
        scorePercent: scoreValue,
        timeTakenSeconds: timeValue,
        answers: answers as Prisma.InputJsonValue | undefined,
      },
    });

    if (scoreValue !== null) {
      await prisma.assignment.update({
        where: { id: assignment.id },
        data: {
          status: AssignmentStatus.COMPLETED,
          score: scoreValue,
        },
      });
    }

    return NextResponse.json(attempt, { status: 201 });
  } catch (error) {
    console.error("LYRIC_ATTEMPT_CREATE_ERROR", error);
    return NextResponse.json({ error: "Failed to record lyric lesson attempt" }, { status: 500 });
  }
}
