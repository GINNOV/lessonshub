// file: src/actions/adminActions.ts
'use server';

import prisma from "@/lib/prisma";
import { Role, User } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/email-templates";
import { auth } from "@/auth";

// ... (getAllUsers, getAllTeachers, updateUserRole remain the same) ...
export async function getAllUsers() {
  try {
    const users = await prisma.user.findMany({
      orderBy: {
        email: 'asc',
      }
    });
    return users;
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return [];
  }
}
export async function getAllTeachers() {
  try {
    const teachers = await prisma.user.findMany({
      where: {
        role: Role.TEACHER,
      },
      orderBy: {
        email: 'asc',
      }
    });
    return teachers;
  } catch (error) {
    console.error("Failed to fetch teachers:", error);
    return [];
  }
}
export async function updateUserRole(userId: string, newRole: Role) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
    });
    revalidatePath('/admin/users');
    return { success: true };
  } catch (error) {
    console.error("Failed to update user role:", error);
    return { success: false, error: "An error occurred while updating the user role." };
  }
}

/**
 * Allows an admin to start impersonating another user.
 * @param userId The ID of the user to impersonate.
 * @returns An object indicating success or failure.
 */
export async function impersonateUser(userId: string) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== Role.ADMIN || session.user.id === userId) {
    return { success: false, error: "Unauthorized or invalid operation." };
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { impersonatingId: userId }
    });
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to impersonate user:", error);
    return { success: false, error: "An error occurred during impersonation." };
  }
}

/**
 * Allows an admin to stop impersonating a user.
 * @returns An object indicating success or failure.
 */
export async function stopImpersonating() {
  const session = await auth();
  if (!session?.user.impersonating || !session.user.originalUserId) {
    return { success: false, error: "Not impersonating" };
  }

  try {
    await prisma.user.update({
      where: { id: session.user.originalUserId },
      data: { impersonatingId: null }
    });
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to stop impersonating:", error);
    return { success: false, error: "An error occurred." };
  }
}
export { stopImpersonating as stopImpersonation };

// ... (rest of the file remains the same) ...
export async function getAllEmailTemplates() {
  try {
    const templates = await prisma.emailTemplate.findMany({
      orderBy: { name: 'asc' },
    });
    return templates;
  } catch (error) {
    console.error("Failed to fetch email templates:", error);
    return [];
  }
}
export { getAllEmailTemplates as getEmailTemplates };
export async function getEmailTemplateByName(name: string) {
  try {
    const template = await prisma.emailTemplate.findUnique({
      where: { name },
    });
    return template;
  } catch (error) {
    console.error(`Failed to fetch email template "${name}":`, error);
    return null;
  }
}
export async function updateEmailTemplate(name: string, data: { subject?: string; body?: string; buttonColor?: string }) {
    try {
        await prisma.emailTemplate.update({
            where: { name },
            data,
        });
        revalidatePath(`/admin/emails/edit/${name}`);
        revalidatePath('/admin/emails');
        return { success: true };
    } catch (error) {
        console.error("Failed to update email template:", error);
        return { success: false, error: "An error occurred." };
    }
}
export async function getAllLessons() {
  try {
    const lessons = await prisma.lesson.findMany({
      include: {
        teacher: true,
        assignments: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return lessons;
  } catch (error) {
    console.error("Failed to fetch all lessons:", error);
    return [];
  }
}
export async function reassignLesson(lessonId: string, newTeacherId: string | null) {
    try {
        await prisma.lesson.update({
            where: { id: lessonId },
            data: { teacherId: newTeacherId }
        });
        revalidatePath('/admin/lessons');
        return { success: true };
    } catch (error) {
        console.error("Failed to reassign lesson:", error);
        return { success: false, error: "An error occurred." };
    }
}
export async function sendTestEmail(templateName: string, testEmail: string) {
    try {
        await sendEmail({
            to: testEmail,
            templateName: templateName,
            data: {
                studentName: '[Test Student]',
                teacherName: '[Test Teacher]',
                lessonTitle: '[Test Lesson]',
                deadline: new Date().toLocaleString(),
                button: '<a href="#" style="color: #ffffff; background-color: #007bff; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Test Button</a>',
            }
        });
        return { success: true };
    } catch (error) {
        console.error("Failed to send test email:", error);
        return { success: false, error: (error as Error).message };
    }
}
export async function updateLessonPrice(lessonId: string, newPrice: number) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== Role.ADMIN) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await prisma.lesson.update({
      where: { id: lessonId },
      data: { price: newPrice },
    });
    revalidatePath('/admin/lessons');
    return { success: true };
  } catch (error) {
    console.error("Failed to update lesson price:", error);
    return { success: false, error: "An error occurred." };
  }
}
export async function updateUserPayingStatus(userId: string, isPaying: boolean) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== Role.ADMIN) {
    return { success: false, error: "Unauthorized" };
  }
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { isPaying },
    });
    revalidatePath('/admin/users');
    return { success: true };
  } catch (error) {
    console.error("Failed to update user paying status:", error);
    return { success: false, error: "An error occurred." };
  }
}