// file: src/actions/userActions.tsx

'use server';

import { auth, signOut } from "@/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { render } from '@react-email/render';
import UserDeletedAdminNotificationEmail from "@/emails/UserDeletedAdminNotificationEmail";

async function sendDeletionAdminNotifications(deletedUser: { name: string | null; email: string }) {
    const admins = await prisma.user.findMany({ where: { role: Role.ADMIN } });
    if (admins.length === 0) return;

    for (const admin of admins) {
        if (admin.email) {
            try {
                const emailHtml = await render(
                    <UserDeletedAdminNotificationEmail
                        adminName={admin.name}
                        deletedUserName={deletedUser.name}
                        deletedUserEmail={deletedUser.email}
                    />
                );

                await fetch("https://api.resend.com/emails", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        from: process.env.EMAIL_FROM,
                        to: admin.email,
                        subject: `[LessonHUB] User Account Deleted: ${deletedUser.name || deletedUser.email}`,
                        html: emailHtml,
                    }),
                });
            } catch (error) {
                console.error(`Failed to send user deletion notification to admin ${admin.email}:`, error);
            }
        }
    }
}

export async function changePassword(newPassword: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });

    if (!user) {
      return { success: false, error: "User not found." };
    }

    const newHashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: session.user.id },
      data: { hashedPassword: newHashedPassword },
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: "An error occurred while changing the password." };
  }
}

export async function deleteUserAccount() {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const userToDelete = await prisma.user.findUnique({
        where: { id: session.user.id },
    });

    if (!userToDelete) {
        return { success: false, error: "User not found." };
    }
    
    // Notify admins *before* deleting the user
    await sendDeletionAdminNotifications(userToDelete);

    await prisma.user.delete({
      where: { id: session.user.id },
    });
    
    // The user no longer exists, sign them out.
    await signOut({ redirectTo: '/', redirect: false });

    return { success: true };
  } catch (error) {
    return { success: false, error: "An error occurred while deleting the account." };
  }
}