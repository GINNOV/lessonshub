// file: src/app/api/assignments/[assignmentId]/arkaning/complete/route.ts
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { AssignmentStatus, LessonType, PointReason } from '@prisma/client';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ assignmentId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { assignmentId } = await params;
  const body = await request.json().catch(() => null);
  const outcome = body?.outcome;
  if (outcome !== 'win' && outcome !== 'lose') {
    return new NextResponse(JSON.stringify({ error: 'Invalid outcome.' }), { status: 400 });
  }

  const assignment = await prisma.assignment.findFirst({
    where: { id: assignmentId, studentId: session.user.id },
    select: { status: true, lesson: { select: { type: true } } },
  });

  if (!assignment || assignment.lesson.type !== LessonType.ARKANING) {
    return new NextResponse(JSON.stringify({ error: 'ArkanING assignment not found.' }), {
      status: 404,
    });
  }

  if (assignment.status !== AssignmentStatus.PENDING) {
    return NextResponse.json({ success: true });
  }

  const marketplacePurchase = await prisma.pointTransaction.findFirst({
    where: {
      assignmentId,
      userId: session.user.id,
      reason: PointReason.MARKETPLACE_PURCHASE,
    },
    select: { id: true },
  });
  if (marketplacePurchase) {
    return NextResponse.json({ success: true });
  }

  await prisma.assignment.update({
    where: { id: assignmentId },
    data:
      outcome === 'win'
        ? { status: AssignmentStatus.COMPLETED, score: 10, gradedAt: new Date() }
        : { status: AssignmentStatus.FAILED, score: -1, gradedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
