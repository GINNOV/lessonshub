// file: src/actions/userActions.tsx

'use server';

import { auth, signOut } from "@/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

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