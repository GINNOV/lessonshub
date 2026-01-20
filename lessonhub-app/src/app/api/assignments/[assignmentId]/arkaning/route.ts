// file: src/app/api/assignments/[assignmentId]/arkaning/route.ts
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { LessonType, PointReason } from '@prisma/client';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ assignmentId: string }> },
) {
  const session = await auth();
  if (!session || !session.user) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { assignmentId } = await params;
  const body = await request.json();
  const outcome = body?.outcome;
  if (outcome !== 'correct' && outcome !== 'wrong') {
    return new NextResponse(JSON.stringify({ error: 'Invalid outcome.' }), { status: 400 });
  }

  const assignment = await prisma.assignment.findFirst({
    where: { id: assignmentId, studentId: session.user.id },
    include: {
      lesson: {
        select: {
          type: true,
          arkaningConfig: true,
        },
      },
    },
  });

  if (!assignment || assignment.lesson.type !== LessonType.ARKANING || !assignment.lesson.arkaningConfig) {
    return new NextResponse(JSON.stringify({ error: 'ArkanING assignment not found.' }), { status: 404 });
  }

  const pointsDelta =
    outcome === 'correct' ? assignment.lesson.arkaningConfig.pointsPerCorrect : -50;
  const eurosDelta =
    outcome === 'correct' ? assignment.lesson.arkaningConfig.eurosPerCorrect : -50;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: session.user.id },
        select: { totalPoints: true },
      });
      const currentPoints = user?.totalPoints ?? 0;
      const nextPoints = currentPoints + pointsDelta;

      const updatedUser = await tx.user.update({
        where: { id: session.user.id },
        data: { totalPoints: nextPoints },
        select: { totalPoints: true },
      });

      await tx.pointTransaction.create({
        data: {
          userId: session.user.id,
          assignmentId,
          points: pointsDelta,
          amountEuro: eurosDelta,
          reason: PointReason.ARKANING_GAME,
          note: outcome === 'correct' ? 'ArkanING correct' : 'ArkanING wrong',
        },
      });

      return updatedUser;
    });

    return NextResponse.json(
      { pointsDelta, eurosDelta, totalPoints: updated.totalPoints },
      { status: 200 },
    );
  } catch (error) {
    console.error('ARKANING_ASSIGNMENT_SCORE_ERROR', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to record ArkanING score.' }), {
      status: 500,
    });
  }
}
