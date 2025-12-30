// file: src/actions/adminActions.ts
'use server';

import prisma from "@/lib/prisma";
import { BadgeCategory, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { createButton } from "@/lib/email-templates";
import { sendEmail } from "@/lib/email-templates.server";
import { auth } from "@/auth";
import { hasAdminPrivileges } from "@/lib/authz";

/**
 * Fetches all users from the database.
 * @returns A promise that resolves to an array of all users.
 */
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

/**
 * Fetches all users with the 'TEACHER' role.
 * @returns A promise that resolves to an array of teacher users.
 */
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

/**
 * Updates a user's role.
 * @param userId The ID of the user to update.
 * @param newRole The new role to assign.
 * @returns An object indicating success or failure.
 */
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
  if (!session?.user?.id || !hasAdminPrivileges(session.user) || session.user.id === userId) {
    return { success: false, error: "Unauthorized or invalid operation." };
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { impersonatedById: userId }
    });
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to impersonate user:", error);
    return { success: false, error: "An error occurred during impersonation." };
  }
}

/**
 * Toggles the suspension status of a user's account.
 */
export async function toggleUserSuspension(userId: string) {
  const session = await auth();
  if (!session?.user?.id || !hasAdminPrivileges(session.user)) {
    return { success: false, error: "Unauthorized" };
  }
  try {
    const userToUpdate = await prisma.user.findUnique({ where: { id: userId } });
    if (!userToUpdate) {
      return { success: false, error: "User not found." };
    }

    await prisma.user.update({
      where: { id: userId },
      data: { isSuspended: !userToUpdate.isSuspended },
    });
    revalidatePath('/admin/users');
    return { success: true };
  } catch (error) {
    console.error("Failed to toggle user suspension:", error);
    return { success: false, error: "An error occurred." };
  }
}

/**
 * Permanently deletes a user account as an admin.
 */
export async function deleteUserByAdmin(userId: string) {
  const session = await auth();
  if (!session?.user?.id || !hasAdminPrivileges(session.user)) {
    return { success: false, error: "Unauthorized" };
  }
  try {
    if (session.user.id === userId) {
        return { success: false, error: "Admins cannot delete their own account from this panel." };
    }
    await prisma.user.delete({ where: { id: userId } });
    revalidatePath('/admin/users');
    return { success: true };
  } catch (error) {
    console.error("Failed to delete user:", error);
    return { success: false, error: "An error occurred." };
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
      data: { impersonatedById: null }
    });
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to stop impersonating:", error);
    return { success: false, error: "An error occurred." };
  }
}
export { stopImpersonating as stopImpersonation };

export async function setAdminPortalAccess(userId: string, enabled: boolean) {
  const session = await auth();
  if (!session?.user || !hasAdminPrivileges(session.user)) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { hasAdminPortalAccess: enabled },
    });
    revalidatePath("/admin/users");
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("Failed to update admin portal access:", error);
    return { success: false, error: "Unable to update admin portal access." };
  }
}

export async function createBadgeAction(formData: FormData) {
  const session = await auth();
  if (!session?.user || !hasAdminPrivileges(session.user)) {
    return { success: false, error: "Unauthorized" };
  }

  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const description = String(formData.get("description") ?? "").trim();
  const icon = String(formData.get("icon") ?? "").trim();
  const categoryInput = String(formData.get("category") ?? "").trim().toUpperCase();
  const category: BadgeCategory = (Object.values(BadgeCategory) as string[]).includes(categoryInput)
    ? (categoryInput as BadgeCategory)
    : BadgeCategory.PROGRESSION;

  if (!name || !slug) {
    return { success: false, error: "Name and slug are required." };
  }

  try {
    await prisma.badge.create({
      data: {
        name,
        slug,
        description,
        icon: icon || null,
        category,
      },
    });
    revalidatePath("/admin/awards");
    return { success: true };
  } catch (error: any) {
    if (error?.code === "P2002") {
      return { success: false, error: "A badge with this slug already exists." };
    }
    console.error("Failed to create badge", error);
    return { success: false, error: "Unable to create badge. Try again." };
  }
}

export async function createStudentBannerAction(formData: FormData) {
  const session = await auth();
  if (!session?.user || !hasAdminPrivileges(session.user)) {
    return { success: false, error: "Unauthorized" };
  }

  const kicker = String(formData.get("kicker") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const ctaText = String(formData.get("ctaText") ?? "").trim();
  const ctaHref = String(formData.get("ctaHref") ?? "").trim() || "/profile?tab=status";
  const orderValue = Number(formData.get("order") ?? 0);
  const order = Number.isFinite(orderValue) ? orderValue : 0;

  if (!kicker || !title || !body || !ctaText) {
    return { success: false, error: "All fields are required." };
  }

  try {
    await prisma.studentBanner.create({
      data: {
        kicker,
        title,
        body,
        ctaText,
        ctaHref,
        order,
      },
    });
    revalidatePath("/admin/banners");
    revalidatePath("/my-lessons");
    return { success: true };
  } catch (error) {
    console.error("Failed to create student banner", error);
    return { success: false, error: "Unable to create banner. Try again." };
  }
}

export async function updateBadgeAction(formData: FormData) {
  const session = await auth();
  if (!session?.user || !hasAdminPrivileges(session.user)) {
    return { success: false, error: "Unauthorized" };
  }

  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const description = String(formData.get("description") ?? "").trim();
  const icon = String(formData.get("icon") ?? "").trim();
  const categoryInput = String(formData.get("category") ?? "").trim().toUpperCase();
  const category: BadgeCategory = (Object.values(BadgeCategory) as string[]).includes(categoryInput)
    ? (categoryInput as BadgeCategory)
    : BadgeCategory.PROGRESSION;

  if (!id || !name || !slug) {
    return { success: false, error: "Name and slug are required." };
  }

  try {
    await prisma.badge.update({
      where: { id },
      data: {
        name,
        slug,
        description,
        icon: icon || null,
        category,
      },
    });
    revalidatePath("/admin/awards");
    return { success: true };
  } catch (error: any) {
    if (error?.code === "P2002") {
      return { success: false, error: "Slug already in use by another badge." };
    }
    console.error("Failed to update badge", error);
    return { success: false, error: "Unable to update badge. Try again." };
  }
}

export async function toggleStudentBannerAction(bannerId: string, isActive: boolean) {
  const session = await auth();
  if (!session?.user || !hasAdminPrivileges(session.user)) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await prisma.studentBanner.update({
      where: { id: bannerId },
      data: { isActive },
    });
    revalidatePath("/admin/banners");
    revalidatePath("/my-lessons");
    return { success: true };
  } catch (error) {
    console.error("Failed to update banner", error);
    return { success: false, error: "Unable to update banner." };
  }
}

export async function updateStudentBannerAction(formData: FormData) {
  const session = await auth();
  if (!session?.user || !hasAdminPrivileges(session.user)) {
    return { success: false, error: "Unauthorized" };
  }

  const id = String(formData.get("id") ?? "").trim();
  const kicker = String(formData.get("kicker") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const ctaText = String(formData.get("ctaText") ?? "").trim();
  const ctaHref = String(formData.get("ctaHref") ?? "").trim() || "/profile?tab=status";
  const orderValue = Number(formData.get("order") ?? 0);
  const order = Number.isFinite(orderValue) ? orderValue : 0;

  if (!id || !kicker || !title || !body || !ctaText) {
    return { success: false, error: "All fields are required." };
  }

  try {
    await prisma.studentBanner.update({
      where: { id },
      data: { kicker, title, body, ctaText, ctaHref, order },
    });
    revalidatePath("/admin/banners");
    revalidatePath("/my-lessons");
    return { success: true };
  } catch (error) {
    console.error("Failed to update banner", error);
    return { success: false, error: "Unable to update banner. Try again." };
  }
}


/**
 * Fetches all email templates.
 * @returns A promise that resolves to an array of all email templates.
 */
export async function getAllEmailTemplates() {
  try {
    const { defaultEmailTemplates } = await import('@/lib/email-templates');
    const existing = await prisma.emailTemplate.findMany({ select: { name: true } });
    const existingNames = new Set(existing.map(t => t.name));
    const missing = Object.keys(defaultEmailTemplates).filter(n => !existingNames.has(n));
    if (missing.length > 0) {
      await prisma.emailTemplate.createMany({
        data: missing.map((n) => ({
          name: n,
          subject: (defaultEmailTemplates as any)[n].subject,
          body: (defaultEmailTemplates as any)[n].body,
          buttonColor: (defaultEmailTemplates as any)[n].buttonColor,
          description: (defaultEmailTemplates as any)[n].description ?? null,
          category: (defaultEmailTemplates as any)[n].category ?? null,
        })),
        skipDuplicates: true,
      });
    }
    await Promise.all(
      Object.entries(defaultEmailTemplates).map(([name, template]) =>
        prisma.emailTemplate.updateMany({
          where: {
            name,
            OR: [{ description: null }, { category: null }],
          },
          data: {
            description: template.description ?? null,
            category: template.category ?? null,
          },
        }),
      ),
    );
    const templates = await prisma.emailTemplate.findMany({ orderBy: { name: 'asc' } });
    return templates;
  } catch (error) {
    console.error("Failed to fetch email templates:", error);
    return [];
  }
}
export { getAllEmailTemplates as getEmailTemplates };


/**
 * Fetches a single email template by its unique name.
 * @param name The unique name of the template.
 * @returns A promise that resolves to the template object or null if not found.
 */
export async function getEmailTemplateByName(name: string) {
  try {
    let template = await prisma.emailTemplate.findUnique({ where: { name } });
    if (!template) {
      const { defaultEmailTemplates } = await import('@/lib/email-templates');
      const def = (defaultEmailTemplates as any)[name];
      if (def) {
        template = await prisma.emailTemplate.create({
          data: {
            name,
            subject: def.subject,
            body: def.body,
            buttonColor: def.buttonColor,
            description: def.description ?? null,
            category: def.category ?? null,
          },
        });
      }
    }
    if (template && (template.description === null || template.category === null)) {
      const { defaultEmailTemplates } = await import('@/lib/email-templates');
      const def = (defaultEmailTemplates as any)[name];
      if (def) {
        template = await prisma.emailTemplate.update({
          where: { name },
          data: {
            description: template.description ?? def.description ?? null,
            category: template.category ?? def.category ?? null,
          },
        });
      }
    }
    return template;
  } catch (error) {
    console.error(`Failed to fetch email template "${name}":`, error);
    return null;
  }
}

/**
 * Updates an email template.
 * @param name The unique name of the template to update.
 * @param data The data to update.
 * @returns An object indicating success or failure.
 */
export async function updateEmailTemplate(
  name: string,
  data: { subject?: string; body?: string; buttonColor?: string; description?: string; category?: string },
) {
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

/**
 * Fetches all lessons for the admin management page.
 * @returns A promise that resolves to an array of all lessons.
 */
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

/**
 * Reassigns a lesson to a new teacher.
 * @param lessonId The ID of the lesson to reassign.
 * @param newTeacherId The ID of the new teacher.
 * @returns An object indicating success or failure.
 */
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

/**
 * Sends a test email for a specific template.
 * @param templateName The name of the email template to test.
 * @param testEmail The email address to send the test to.
 * @returns An object indicating success or failure.
 */
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
                button: createButton('Test Button', '#'),
            }
        });
        return { success: true };
    } catch (error) {
        console.error("Failed to send test email:", error);
        return { success: false, error: (error as Error).message };
    }
}

/**
 * Updates the price of a specific lesson.
 * @param lessonId The ID of the lesson to update.
 * @param newPrice The new price to set.
 * @returns An object indicating success or failure.
 */
export async function updateLessonPrice(lessonId: string, newPrice: number) {
  const session = await auth();
  if (!session?.user?.id || !hasAdminPrivileges(session.user)) {
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

/**
 * Toggles the paying status of a user.
 * @param userId The ID of the user to update.
 * @param isPaying The new paying status.
 * @returns An object indicating success or failure.
 */
export async function updateUserPayingStatus(userId: string, isPaying: boolean) {
  const session = await auth();
  if (!session?.user?.id || !hasAdminPrivileges(session.user)) {
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

export async function getAssignedStudents(teacherId: string) {
    try {
        const relations = await prisma.teachersForStudent.findMany({
            where: { teacherId },
            select: { student: true }
        });
        return relations.map(r => r.student);
    } catch (error) {
        console.error("Failed to get assigned students:", error);
        return [];
    }
}

export async function getAssignedTeachers(studentId: string) {
    try {
        const relations = await prisma.teachersForStudent.findMany({
            where: { studentId },
            select: { teacherId: true }
        });
        return relations.map(r => r.teacherId);
    } catch (error) {
        console.error("Failed to get assigned teachers:", error);
        return [] as string[];
    }
}

export async function assignStudentsToTeacher(teacherId: string, studentIds: string[]) {
    try {
        await prisma.$transaction(async (tx) => {
            await tx.teachersForStudent.deleteMany({
                where: { teacherId }
            });

            if (studentIds.length > 0) {
                const data = studentIds.map(studentId => ({
                    teacherId,
                    studentId
                }));
                await tx.teachersForStudent.createMany({ data });
            }
        });

        revalidatePath(`/admin/teachers/${teacherId}`);
        return { success: true };
    } catch (error) {
        console.error("Failed to assign students to teacher:", error);
        return { success: false, error: "An error occurred." };
    }
}

export async function assignTeachersToStudent(studentId: string, teacherIds: string[]) {
    const session = await auth();
    if (!session?.user?.id || !hasAdminPrivileges(session.user)) {
        return { success: false, error: "Unauthorized" };
    }
    try {
        await prisma.$transaction(async (tx) => {
            await tx.teachersForStudent.deleteMany({ where: { studentId } });
            if (teacherIds.length > 0) {
                const data = teacherIds.map(teacherId => ({ studentId, teacherId }));
                await tx.teachersForStudent.createMany({ data });
            }
        });
        revalidatePath(`/admin/users/edit/${studentId}`);
        revalidatePath('/admin/users');
        return { success: true };
    } catch (error) {
        console.error("Failed to assign teachers to student:", error);
        return { success: false, error: "An error occurred." };
    }
}

export async function getDashboardSettings() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }
  
  const userWithSettings = await prisma.user.findFirst({
    where: {
      role: Role.ADMIN,
    },
    select: {
      progressCardTitle: true,
      progressCardBody: true,
      progressCardLinkText: true,
      progressCardLinkUrl: true,
      assignmentSummaryFooter: true,
      referralRewardPercent: true,
      referralRewardMonthlyAmount: true,
    },
  });
  
  if (!userWithSettings) {
    return null;
  }

  const {
    progressCardTitle,
    progressCardBody,
    progressCardLinkText,
    progressCardLinkUrl,
    assignmentSummaryFooter,
    referralRewardPercent,
    referralRewardMonthlyAmount,
  } = userWithSettings;

  return {
    progressCardTitle,
    progressCardBody,
    progressCardLinkText,
    progressCardLinkUrl,
    assignmentSummaryFooter,
    referralRewardPercent: referralRewardPercent.toNumber(),
    referralRewardMonthlyAmount: referralRewardMonthlyAmount.toNumber(),
  };
}

interface DashboardSettings {
    progressCardTitle?: string;
    progressCardBody?: string;
    progressCardLinkText?: string;
    progressCardLinkUrl?: string;
    assignmentSummaryFooter?: string;
    referralRewardPercent?: number;
    referralRewardMonthlyAmount?: number;
}

export async function getAiSettings() {
  const session = await auth();
  if (!session?.user?.id || !hasAdminPrivileges(session.user)) {
    return null;
  }

  const config = await prisma.appConfig.findUnique({
    where: { id: 1 },
    select: { geminiApiKey: true },
  });

  return {
    geminiApiKey: config?.geminiApiKey ?? null,
  };
}

export async function updateAiSettings(input: { geminiApiKey?: string | null }) {
  const session = await auth();
  if (!session?.user?.id || !hasAdminPrivileges(session.user)) {
    return { success: false, error: "Unauthorized" };
  }

  const geminiApiKey = input.geminiApiKey?.trim() || null;

  try {
    await prisma.appConfig.upsert({
      where: { id: 1 },
      update: { geminiApiKey },
      create: { id: 1, geminiApiKey },
    });
    revalidatePath("/admin");
    revalidatePath("/admin/settings");
    revalidatePath("/speechpractice");
    return { success: true };
  } catch (error) {
    console.error("Failed to update AI settings:", error);
    return { success: false, error: "Unable to save AI settings." };
  }
}

export async function toggleTakingABreakForUser(userId: string) {
    const session = await auth();
    if (!session?.user?.id || !hasAdminPrivileges(session.user)) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { isTakingBreak: true }
        });

        if (!user) {
            return { success: false, error: "User not found." };
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { isTakingBreak: !user.isTakingBreak }
        });

        revalidatePath(`/admin/users/${userId}`);

        return { success: true, isTakingBreak: updatedUser.isTakingBreak };
    } catch (error) {
        console.error("Failed to toggle user break status:", error);
        return { success: false, error: "An error occurred." };
    }
}

export async function updateDashboardSettings(data: DashboardSettings) {
    const session = await auth();
    if (!session?.user?.id || !hasAdminPrivileges(session.user)) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        await prisma.user.updateMany({
            where: {
                role: Role.ADMIN,
            },
            data: {
                progressCardTitle: data.progressCardTitle,
                progressCardBody: data.progressCardBody,
                progressCardLinkText: data.progressCardLinkText,
                progressCardLinkUrl: data.progressCardLinkUrl,
                assignmentSummaryFooter: data.assignmentSummaryFooter,
                referralRewardPercent: data.referralRewardPercent,
                referralRewardMonthlyAmount: data.referralRewardMonthlyAmount,
            },
        });

        revalidatePath('/admin/settings');
        revalidatePath('/my-lessons');
        return { success: true };

    } catch (error) {
        console.error("Failed to update dashboard settings:", error);
        return { success: false, error: "An error occurred." };
    }
}

export async function signOutAllUsers() {
    const session = await auth();
    if (!session?.user?.id || !hasAdminPrivileges(session.user)) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        await prisma.session.deleteMany();
        return { success: true };
    } catch (error) {
        console.error("Failed to sign out all users:", error);
        return { success: false, error: "An error occurred." };
    }
}
