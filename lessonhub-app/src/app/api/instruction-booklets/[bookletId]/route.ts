import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ bookletId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== Role.TEACHER) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { bookletId } = await params;
  const body = await request.json();

  const booklet = await prisma.instructionBooklet.findUnique({
    where: { id: bookletId },
    select: { teacherId: true },
  });

  if (!booklet || booklet.teacherId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const updated = await prisma.instructionBooklet.update({
    where: { id: bookletId },
    data: {
      title: body.title?.trim() ?? undefined,
      body: body.body?.trim() ?? undefined,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ bookletId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== Role.TEACHER) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { bookletId } = await params;

  const booklet = await prisma.instructionBooklet.findUnique({
    where: { id: bookletId },
    select: { teacherId: true },
  });

  if (!booklet || booklet.teacherId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.instructionBooklet.delete({ where: { id: bookletId } });
  return NextResponse.json({ success: true });
}
