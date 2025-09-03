// file: src/app/admin/lessons/page.tsx

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAllLessons, getAllTeachers } from "@/actions/adminActions";
import LessonTable from "@/app/components/LessonTable";
import { Role } from "@prisma/client";

export default async function LessonManagementPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | undefined };
}) {
  const session = await auth();
  if (!session || session.user.role !== Role.ADMIN) {
    redirect("/");
  }

  const [lessons, teachers] = await Promise.all([
    getAllLessons(),
    getAllTeachers(),
  ]);
  const searchTerm = searchParams?.search || '';

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Lesson Management</h1>
      <div className="bg-white p-6 rounded-lg shadow-md border">
        <LessonTable lessons={lessons} teachers={teachers} searchTerm={searchTerm} />
      </div>
    </div>
  );
}