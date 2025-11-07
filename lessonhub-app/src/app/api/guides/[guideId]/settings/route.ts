import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { LessonType } from '@prisma/client';
import { NextResponse } from 'next/server';

export async function PATCH(request: Request, { params }: { params: { guideId: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { guideId } = params;
  const body = await request.json().catch(() => ({}));
  const updates: Record<string, boolean> = {};

  if (typeof body.guideIsVisible === 'boolean') {
    updates.guideIsVisible = body.guideIsVisible;
  }
  if (typeof body.guideIsFreeForAll === 'boolean') {
    updates.guideIsFreeForAll = body.guideIsFreeForAll;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields provided.' }, { status: 400 });
  }

  const existing = await prisma.lesson.findFirst({
    where: {
      id: guideId,
      teacherId: session.user.id,
      type: LessonType.LEARNING_SESSION,
    },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Guide not found.' }, { status: 404 });
  }

  const updated = await prisma.lesson.update({
    where: { id: guideId },
    data: updates,
    select: {
      id: true,
      guideIsVisible: true,
      guideIsFreeForAll: true,
    },
  });

  return NextResponse.json({ success: true, guide: updated });
}
