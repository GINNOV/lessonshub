// file: src/actions/adminActions.tsx
'use server';

import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";
import { revalidatePath } from 'next/cache';
import { auth } from "@/auth";
import { defaultEmailTemplates, replacePlaceholders, createButton, sendEmail } from '@/lib/email-templates';

// Helper to get all email templates or create them if they don't exist
export async function getEmailTemplates() {
  for (const name in defaultEmailTemplates) {
    const existing = await prisma.emailTemplate.findUnique({ where: { name } });
    if (!existing) {
        await prisma.emailTemplate.create({
            data: {
                name,
                subject: defaultEmailTemplates[name].subject,
                body: defaultEmailTemplates[name].body,
                buttonColor: defaultEmailTemplates[name].buttonColor,
            }
        });
    }
  }
  
  return prisma.emailTemplate.findMany({ orderBy: { name: 'asc' } });
}

export async function getEmailTemplateByName(name: string) {
    let template = await prisma.emailTemplate.findUnique({ where: { name } });

    // If template doesn't exist in DB, create it from the default
    if (!template && defaultEmailTemplates[name]) {
        console.log(`Template "${name}" not found in DB, creating from default.`);
        template = await prisma.emailTemplate.create({
            data: {
                name,
                subject: defaultEmailTemplates[name].subject,
                body: defaultEmailTemplates[name].body,
                buttonColor: defaultEmailTemplates[name].buttonColor,
            }
        });
    }

    return template;
}

export async function updateEmailTemplate(id: string, subject: string, body: string, buttonColor?: string) {
    try {
        await prisma.emailTemplate.update({
            where: { id },
            data: { subject, body, buttonColor },
        });
        revalidatePath('/admin/emails/edit/[templateName]', 'page');
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Failed to update template.' };
    }
}

export async function sendTestEmail(templateName: string, subject: string, body: string, recipient: string, buttonColor?: string) {
    const session = await auth();
    if (!session?.user || session.user.role !== Role.ADMIN) {
        return { success: false, error: 'Unauthorized.' };
    }

    try {
        const dummyData: Record<string, string> = {
            studentName: "Alex Doe",
            teacherName: "Dr. Smith",
            adminName: session.user.name || "Admin",
            lessonTitle: "Introduction to Astrophysics",
            deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleString(),
            score: "10",
            teacherComments: "<p><em>Great work on the assignment!</em></p>",
            newUserName: "Jane Doe",
            newUserEmail: "jane.doe@example.com",
            deletedUserName: "John Smith",
            deletedUserEmail: "john.smith@example.com",
            button: createButton("Click Here", "https://example.com", buttonColor)
        };

        // We use the new central function but pass the live editor content to it
        await sendEmail({
            to: recipient,
            templateName: 'test', // Use a temporary name
            data: dummyData,
            subjectPrefix: '[TEST] ',
            // @ts-ignore
            override: { subject, body } 
        });

        return { success: true };
    } catch (error) {
        return { success: false, error: 'Failed to send test email.' };
    }
}


// The rest of your adminActions.tsx file...
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