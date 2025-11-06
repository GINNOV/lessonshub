import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== Role.TEACHER) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const booklets = await prisma.instructionBooklet.findMany({
    where: { teacherId: session.user.id },
    orderBy: { updatedAt: 'desc' },
  });

  return NextResponse.json(booklets);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== Role.TEACHER) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { title, body } = await request.json();

  if (!title?.trim() || !body?.trim()) {
    return NextResponse.json({ error: 'Title and body are required.' }, { status: 400 });
  }

  const booklet = await prisma.instructionBooklet.create({
    data: {
      title: title.trim(),
      body: body.trim(),
      teacherId: session.user.id,
    },
  });

  return NextResponse.json(booklet, { status: 201 });
}
