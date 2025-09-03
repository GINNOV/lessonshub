// file: src/app/admin/page.tsx

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAllUsers, getAllLessons, getAllTeachers } from "@/actions/adminActions";
import UserTable from "@/app/components/UserTable";
import LessonTable from "@/app/components/LessonTable";
import { Role } from "@prisma/client";

export default async function AdminPage() {
  const session = await auth();
  if (!session || session.user.role !== Role.ADMIN) {
    redirect("/");
  }

  const [users, lessons, teachers] = await Promise.all([
    getAllUsers(),
    getAllLessons(),
    getAllTeachers(),
  ]);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      <div className="bg-white p-6 rounded-lg shadow-md border mb-8">
        <h2 className="text-2xl font-semibold mb-4">User Management</h2>
        <UserTable users={users} />
      </div>
      <div className="bg-white p-6 rounded-lg shadow-md border">
        <h2 className="text-2xl font-semibold mb-4">Lesson Management</h2>
        <LessonTable lessons={lessons} teachers={teachers} />
      </div>
    </div>
  );
}