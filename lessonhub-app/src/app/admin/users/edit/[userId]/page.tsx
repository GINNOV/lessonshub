// file: src/app/admin/users/edit/[userId]/page.tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import ProfileForm from "@/app/components/ProfileForm";
import { Button } from "@/components/ui/button";

// This is a helper function to fetch the specific user for this page.
async function getUserForAdmin(userId: string) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    return user;
  } catch (error) {
    console.error("Failed to fetch user for admin edit:", error);
    return null;
  }
}

export default async function AdminEditUserPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const session = await auth();
  if (!session || session.user.role !== Role.ADMIN) {
    redirect("/");
  }

  const { userId } = await params;
  const userToEdit = await getUserForAdmin(userId);

  if (!userToEdit) {
    return (
      <div>
        <h1 className="text-2xl font-bold">User Not Found</h1>
        <p>The user you are trying to edit could not be found.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/admin/users">&larr; Back to User Management</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Edit User Profile</h1>
          <p className="text-muted-foreground">
            Editing: {userToEdit.name || userToEdit.email}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/users">&larr; Back to User Management</Link>
        </Button>
      </div>

      {/* This form is now being used by an admin */}
      <ProfileForm userToEdit={userToEdit} isAdmin={true} />
    </div>
  );
}