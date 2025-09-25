// file: src/actions/userActions.tsx
'use server';

import { auth, signOut } from "@/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { getEmailTemplateByName } from "./adminActions";
import { replacePlaceholders } from "@/lib/email-templates";
import { nanoid } from 'nanoid';
import { revalidatePath } from "next/cache";

async function sendDeletionAdminNotifications(deletedUser: { name: string | null; email: string }) {
    const admins = await prisma.user.findMany({ where: { role: Role.ADMIN } });
    if (admins.length === 0) return;

    const template = await getEmailTemplateByName('user_deleted_admin');
    if (!template) return;

    for (const admin of admins) {
        if (admin.email) {
            try {
                const subject = replacePlaceholders(template.subject, { deletedUserName: deletedUser.name || deletedUser.email });
                const body = replacePlaceholders(template.body, {
                    adminName: admin.name || 'Admin',
                    deletedUserName: deletedUser.name || 'Not provided',
                    deletedUserEmail: deletedUser.email,
                });

                await fetch("https://api.resend.com/emails", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        from: process.env.EMAIL_FROM,
                        to: admin.email,
                        subject,
                        html: body,
                    }),
                });
            } catch (error) {
                console.error(`Failed to send user deletion notification to admin ${admin.email}:`, error);
            }
        }
    }
}

export async function toggleTakingABreak() {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { isTakingBreak: true }
        });

        if (!user) {
            return { success: false, error: "User not found." };
        }

        const updatedUser = await prisma.user.update({
            where: { id: session.user.id },
            data: { isTakingBreak: !user.isTakingBreak }
        });

        revalidatePath('/profile');
        revalidatePath('/my-lessons');

        return { success: true, isTakingBreak: updatedUser.isTakingBreak };
    } catch (error) {
        return { success: false, error: "An error occurred while updating your status." };
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
    
    await sendDeletionAdminNotifications(userToDelete);

    await prisma.user.delete({
      where: { id: session.user.id },
    });
    
    await signOut({ redirectTo: '/', redirect: false });

    return { success: true };
  } catch (error) {
    return { success: false, error: "An error occurred while deleting the account." };
  }
}


export async function getOrCreateReferralCode() {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { referralCode: true },
    });

    if (user?.referralCode) {
      return { success: true, code: user.referralCode };
    }

    const newCode = nanoid(8);
    await prisma.user.update({
      where: { id: session.user.id },
      data: { referralCode: newCode },
    });

    return { success: true, code: newCode };
  } catch (error) {
    console.error("Failed to get or create referral code:", error);
    return { success: false, error: "An error occurred." };
  }
}