// file: src/actions/classActions.ts
'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { sendEmail } from '@/lib/email-templates';

export async function getClassesForTeacher() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== Role.TEACHER) return [];
  try {
    const classes = await prisma.class.findMany({
      where: { teacherId: session.user.id },
      include: {
        students: {
          include: { student: { select: { id: true, name: true, email: true, image: true, isTakingBreak: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    return classes;
  } catch (error: any) {
    // Gracefully handle environments where the Class table hasn't been migrated yet
    const code = error?.code as string | undefined;
    const msg = typeof error?.message === 'string' ? error.message : '';
    if (code === 'P2021' || ('does not exist' in msg)) {
      console.warn('Classes feature not yet migrated (missing table). Returning empty list.');
      return [];
    }
    console.error('Failed to fetch classes:', error);
    return [];
  }
}

export async function createClass(name: string) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== Role.TEACHER) {
    return { success: false, error: 'Unauthorized' };
  }
  try {
    const cls = await prisma.class.create({ data: { name, teacherId: session.user.id } });
    revalidatePath('/dashboard/classes');
    return { success: true, class: cls };
  } catch (error) {
    console.error('Failed to create class:', error);
    return { success: false, error: 'An error occurred.' };
  }
}

export async function shutdownClass(classId: string) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== Role.TEACHER) {
    return { success: false, error: 'Unauthorized' };
  }
  try {
    const cls = await prisma.class.findFirst({ where: { id: classId, teacherId: session.user.id } });
    if (!cls) return { success: false, error: 'Class not found' };

    const links = await prisma.teachersForStudent.findMany({
      where: { classId, teacherId: session.user.id },
      include: { student: true },
    });

    await prisma.$transaction([
      prisma.class.update({ where: { id: classId }, data: { isActive: false } }),
      prisma.teachersForStudent.updateMany({ where: { classId }, data: { classId: null } }),
    ]);

    for (const link of links) {
      if (link.student.email) {
        await sendEmail({
          to: link.student.email,
          templateName: 'custom',
          data: { studentName: link.student.name || 'student', teacherName: session.user.name || 'your teacher', lessonTitle: '' },
          override: {
            subject: `Your class "${cls.name}" has been decommissioned`,
            body: `Hello ${link.student.name || 'student'},\n\nYour class "${cls.name}" with ${session.user.name || 'your teacher'} has been decommissioned. Your records and accomplishments remain intact. You will be notified if you are reassigned to another class.\n\nThanks!`,
          },
        });
      }
    }

    revalidatePath('/dashboard/classes');
    return { success: true };
  } catch (error) {
    console.error('Failed to shutdown class:', error);
    return { success: false, error: 'An error occurred.' };
  }
}

export async function setStudentClass(studentId: string, classId: string | null) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== Role.TEACHER) {
    return { success: false, error: 'Unauthorized' };
  }
  try {
    // Ensure the student is assigned to this teacher
    const link = await prisma.teachersForStudent.findUnique({
      where: { studentId_teacherId: { studentId, teacherId: session.user.id } },
      include: { student: true },
    });
    if (!link) return { success: false, error: 'Student is not assigned to you.' };

    if (classId) {
      const cls = await prisma.class.findFirst({ where: { id: classId, teacherId: session.user.id, isActive: true } });
      if (!cls) return { success: false, error: 'Class not found or inactive.' };
    }

    const previousClassId = link.classId;
    await prisma.teachersForStudent.update({
      where: { studentId_teacherId: { studentId, teacherId: session.user.id } },
      data: { classId },
    });

    if (link.student.email && previousClassId !== classId) {
      let fromName = '';
      if (previousClassId) {
        const prev = await prisma.class.findUnique({ where: { id: previousClassId } });
        fromName = prev?.name || '';
      }
      let toName = '';
      if (classId) {
        const to = await prisma.class.findUnique({ where: { id: classId } });
        toName = to?.name || '';
      }
      await sendEmail({
        to: link.student.email,
        templateName: 'custom',
        data: { studentName: link.student.name || 'student', teacherName: session.user.name || 'your teacher', lessonTitle: '' },
        override: {
          subject: `You've been reassigned to a new class`,
          body: `Hello ${link.student.name || 'student'},\n\nYou have been reassigned ${fromName ? `from "${fromName}" ` : ''}to ${toName ? `"${toName}"` : 'no class' } by ${session.user.name || 'your teacher'}. Your records and accomplishments remain intact.\n\nThanks!`,
        },
      });
    }

    revalidatePath('/dashboard/classes');
    return { success: true };
  } catch (error) {
    console.error('Failed to update student class:', error);
    return { success: false, error: 'An error occurred.' };
  }
}

