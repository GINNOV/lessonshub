// file: src/actions/adminActions.ts
'use server';

import prisma from "@/lib/prisma";
import { Role, User } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { sendEmail, createButton } from "@/lib/email-templates";
import { auth } from "@/auth";

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
  if (!session?.user?.id || session.user.role !== Role.ADMIN || session.user.id === userId) {
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
  if (!session?.user?.id || session.user.role !== Role.ADMIN) {
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
  if (!session?.user?.id || session.user.role !== Role.ADMIN) {
    return { success: false, error: "Unauthorized" };
  }
  try {
    // Prevent admin from deleting their own account via this action
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
// ✅ ALIAS EXPORT TO MATCH COMPONENT IMPORT
export { stopImpersonating as stopImpersonation };


/**
 * Fetches all email templates.
 * @returns A promise that resolves to an array of all email templates.
 */
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
// ✅ ALIAS EXPORT TO MATCH COMPONENT IMPORT
export { getAllEmailTemplates as getEmailTemplates };


/**
 * Fetches a single email template by its unique name.
 * @param name The unique name of the template.
 * @returns A promise that resolves to the template object or null if not found.
 */
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

/**
 * Updates an email template.
 * @param name The unique name of the template to update.
 * @param data The data to update.
 * @returns An object indicating success or failure.
 */
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
 * ✅ ADDED MISSING FUNCTION
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
 * ✅ ADDED MISSING FUNCTION
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
                button: '<a href="#" style="color: #ffffff; background-color: #007bff; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Test Button</a>',
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

/**
 * Toggles the paying status of a user.
 * @param userId The ID of the user to update.
 * @param isPaying The new paying status.
 * @returns An object indicating success or failure.
 */
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

export async function assignStudentsToTeacher(teacherId: string, studentIds: string[]) {
    try {
        const teacher = await prisma.user.findUnique({
            where: { id: teacherId },
            select: { email: true, name: true }
        });

        if (!teacher || !teacher.email) {
            return { success: false, error: "Teacher not found or has no email." };
        }

        const existingAssignments = await prisma.teachersForStudent.findMany({
            where: { teacherId },
            select: { studentId: true }
        });
        const existingStudentIds = new Set(existingAssignments.map(a => a.studentId));
        
        const newlyAssignedIds = studentIds.filter(id => !existingStudentIds.has(id));

        // Perform DB operations in a transaction
        await prisma.$transaction([
            prisma.teachersForStudent.deleteMany({
                where: { teacherId }
            }),
            prisma.teachersForStudent.createMany({
                data: studentIds.map(studentId => ({
                    teacherId,
                    studentId
                }))
            })
        ]);

        // Send notification if there are new students
        if (newlyAssignedIds.length > 0) {
            const newlyAssignedStudents = await prisma.user.findMany({
                where: { id: { in: newlyAssignedIds } },
                select: { name: true, email: true }
            });

            const studentListHtml = newlyAssignedStudents.map(s => `<li>${s.name || s.email}</li>`).join('');

            await sendEmail({
                to: teacher.email,
                templateName: 'student_assigned_to_teacher',
                data: {
                    teacherName: teacher.name || 'Teacher',
                    studentList: `<ul>${studentListHtml}</ul>`,
                    button: createButton('View Your Dashboard', `${process.env.AUTH_URL}/dashboard`)
                }
            });
        }
        
        revalidatePath(`/admin/teachers/${teacherId}`);
        return { success: true };
    } catch (error) {
        console.error("Failed to assign students to teacher:", error);
        return { success: false, error: "An error occurred." };
    }
}
