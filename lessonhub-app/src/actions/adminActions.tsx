// file: src/actions/adminActions.tsx

'use server';

import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";
import { revalidatePath } from 'next/cache';
import { auth } from "@/auth";

export async function getAllUsers() {
  try {
    const users = await prisma.user.findMany({
      orderBy: {
        email: 'asc',
      },
    });
    return users;
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return [];
  }
}

export async function updateUserRole(userId: string, role: Role) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { role },
    });
    revalidatePath('/admin');
    return { success: true };
  } catch (error) {
    console.error("Failed to update user role:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function getAllLessons() {
  const session = await auth();
  if (session?.user?.role !== Role.ADMIN) {
    console.log('[Admin Action] User is not an admin, returning empty array.');
    return [];
  }
  
  try {
    console.log('[Admin Action] Fetching all lessons for admin.');
    const lessons = await prisma.lesson.findMany({
      include: {
        teacher: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    console.log(`[Admin Action] Found ${lessons.length} lessons.`);
    return lessons;
  } catch (error) {
    console.error("Failed to fetch lessons:", error);
    return [];
  }
}

export async function getAllTeachers() {
  try {
    const teachers = await prisma.user.findMany({
      where: { role: Role.TEACHER },
      orderBy: { name: 'asc' },
    });
    return teachers;
  } catch (error) {
    console.error("Failed to fetch teachers:", error);
    return [];
  }
}

export async function reassignLesson(lessonId: string, newTeacherId: string) {
    try {
        await prisma.lesson.update({
            where: { id: lessonId },
            data: { teacherId: newTeacherId },
        });
        revalidatePath('/admin');
        return { success: true };
    } catch (error) {
        console.error("Failed to reassign lesson:", error);
        return { success: false, error: (error as Error).message };
    }
}

export async function impersonateUser(userId: string) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== Role.ADMIN) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { impersonatedById: userId },
    });
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to impersonate user" };
  }
}

export async function stopImpersonation() {
  const session = await auth();
  const originalUserId = session?.user.originalUserId;

  if (!originalUserId) {
    return { success: false, error: "Not in impersonation mode" };
  }

  try {
    await prisma.user.update({
      where: { id: originalUserId },
      data: { impersonatedById: null },
    });
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to stop impersonation" };
  }
}