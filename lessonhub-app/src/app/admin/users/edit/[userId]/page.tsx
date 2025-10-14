// file: src/app/admin/users/edit/[userId]/page.tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import ProfileForm from "@/app/components/ProfileForm";
import AssignTeachersToStudent from "@/app/components/AssignTeachersToStudent";
import { getAllTeachers, getAssignedTeachers } from "@/actions/adminActions";
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

  // Prepare teacher assignment data if the user is a student.
  let teacherAssignBlock: React.ReactNode = null;
  if (userToEdit.role === Role.STUDENT) {
    const [allTeachers, assignedTeacherIds] = await Promise.all([
      getAllTeachers(),
      getAssignedTeachers(userId),
    ]);
    const serializableTeachers = allTeachers.map(t => ({ id: t.id, name: t.name, email: t.email }));
    teacherAssignBlock = (
      <div id="assign-teachers" className="mt-10">
        <h2 className="text-xl font-semibold mb-3">Assign Teachers</h2>
        <p className="text-sm text-muted-foreground mb-4">Select one or more teachers to assign to this student.</p>
        <AssignTeachersToStudent
          studentId={userId}
          allTeachers={serializableTeachers}
          assignedTeacherIds={assignedTeacherIds}
        />
      </div>
    );
  }

  const serializableUser: any = userToEdit ? { 
    ...userToEdit,
    defaultLessonPrice: userToEdit.defaultLessonPrice?.toNumber() ?? null,
  } : null;

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
      <ProfileForm userToEdit={serializableUser} isAdmin={true} />
      {teacherAssignBlock}
    </div>
  );
}
