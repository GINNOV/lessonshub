// file: src/actions/adminActions.tsx

'use server';

import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";
import { revalidatePath } from 'next/cache';
import { auth } from "@/auth";
import { defaultEmailTemplates, replacePlaceholders, createButton } from '@/lib/email-templates';

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
            }
        });
    }
  }
  
  return prisma.emailTemplate.findMany({ orderBy: { name: 'asc' } });
}

export async function getEmailTemplateByName(name: string) {
    return prisma.emailTemplate.findUnique({ where: { name } });
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

        const finalSubject = replacePlaceholders(subject, dummyData);
        const finalBody = replacePlaceholders(body, dummyData);

        const emailHtml = `
            <html lang="en">
            <head>
                <style>
                body { margin: 0; background-color: #f6f9fc; font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif; }
                .container { background-color: #ffffff; margin: 0 auto; padding: 20px 0 48px; margin-bottom: 64px; border: 1px solid #f0f0f0; border-radius: 8px; max-width: 560px; }
                .box { padding: 0 48px; }
                .hr { border-color: #e6ebf1; margin: 20px 0; }
                .footer { color: #8898aa; font-size: 12px; line-height: 16px; }
                </style>
            </head>
            <body>
                <div class="container">
                <div class="box">
                    ${finalBody}
                    <hr class="hr" />
                    <p class="footer">LessonHUB — The modern platform for modern learning.</p>
                </div>
                </div>
            </body>
            </html>
        `;

        await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                from: process.env.EMAIL_FROM,
                to: recipient,
                subject: `[TEST] ${finalSubject}`,
                html: emailHtml,
            }),
        });

        return { success: true };
    } catch (error) {
        return { success: false, error: 'Failed to send test email.' };
    }
}

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