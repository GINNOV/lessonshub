// file: src/actions/teacherActions.ts
'use server';

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

/**
 * Fetches the preferences for the currently logged-in teacher.
 */
export async function getTeacherPreferences() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== Role.TEACHER) {
    return null;
  }

  try {
    const teacher = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        defaultLessonPrice: true,
        defaultLessonPreview: true,
        defaultLessonNotes: true,
        defaultLessonInstructions: true,
      },
    });
    return teacher;
  } catch (error) {
    console.error("Failed to fetch teacher preferences:", error);
    return null;
  }
}

interface TeacherPreferences {
    defaultLessonPrice?: number;
    defaultLessonPreview?: string;
    defaultLessonNotes?: string;
    defaultLessonInstructions?: string;
}

/**
 * Updates the preferences for the currently logged-in teacher.
 */
export async function updateTeacherPreferences(data: TeacherPreferences) {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== Role.TEACHER) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                defaultLessonPrice: data.defaultLessonPrice,
                defaultLessonPreview: data.defaultLessonPreview,
                defaultLessonNotes: data.defaultLessonNotes,
                defaultLessonInstructions: data.defaultLessonInstructions,
            },
        });

        revalidatePath('/dashboard');
        revalidatePath('/dashboard/create');
        return { success: true };

    } catch (error) {
        console.error("Failed to update teacher preferences:", error);
        return { success: false, error: "An error occurred." };
    }
}