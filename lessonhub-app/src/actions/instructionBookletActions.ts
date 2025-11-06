'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { Role } from '@prisma/client';

export async function getInstructionBookletsForTeacher() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== Role.TEACHER) {
    return [];
  }

  return prisma.instructionBooklet.findMany({
    where: { teacherId: session.user.id },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function createInstructionBooklet(data: { title: string; body: string }) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== Role.TEACHER) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!data.title.trim()) {
    return { success: false, error: 'Title is required' };
  }
  if (!data.body.trim()) {
    return { success: false, error: 'Body is required' };
  }

  const booklet = await prisma.instructionBooklet.create({
    data: {
      title: data.title.trim(),
      body: data.body.trim(),
      teacherId: session.user.id,
    },
  });

  return { success: true, booklet };
}

export async function updateInstructionBooklet(id: string, data: { title?: string; body?: string }) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== Role.TEACHER) {
    return { success: false, error: 'Unauthorized' };
  }

  const booklet = await prisma.instructionBooklet.findUnique({
    where: { id },
    select: { teacherId: true },
  });

  if (!booklet || booklet.teacherId !== session.user.id) {
    return { success: false, error: 'Not found' };
  }

  const updated = await prisma.instructionBooklet.update({
    where: { id },
    data: {
      title: data.title?.trim() ?? undefined,
      body: data.body?.trim() ?? undefined,
    },
  });

  return { success: true, booklet: updated };
}

export async function deleteInstructionBooklet(id: string) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== Role.TEACHER) {
    return { success: false, error: 'Unauthorized' };
  }

  const booklet = await prisma.instructionBooklet.findUnique({
    where: { id },
    select: { teacherId: true },
  });

  if (!booklet || booklet.teacherId !== session.user.id) {
    return { success: false, error: 'Not found' };
  }

  await prisma.instructionBooklet.delete({ where: { id } });
  return { success: true };
}
