// file: src/app/admin/lessons/page.tsx
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAllLessons, getAllTeachers } from "@/actions/adminActions";
import LessonTable from "@/app/components/LessonTable";
import { Role } from "@prisma/client";

export default async function LessonManagementPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session || session.user.role !== Role.ADMIN) {
    redirect("/");
  }

  const [lessons, teachers] = await Promise.all([
    getAllLessons(),
    getAllTeachers(),
  ]);

  const serializableLessons = lessons.map((lesson) => ({
    ...lesson,
    price: lesson.price.toNumber(),
    teacher: lesson.teacher ? {
      ...lesson.teacher,
      defaultLessonPrice: lesson.teacher.defaultLessonPrice?.toNumber() ?? null,
    } : null,
  }));

  const serializableTeachers = teachers.map(teacher => ({
      ...teacher,
      defaultLessonPrice: teacher.defaultLessonPrice?.toNumber() ?? null,
  }));

  const params = await searchParams;
  const searchTerm = typeof params?.search === "string" ? params.search : "";

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Lesson Management</h1>
      <div className="rounded-lg border bg-white p-6 shadow-md">
        <LessonTable
          lessons={serializableLessons}
          teachers={serializableTeachers}
          searchTerm={searchTerm}
        />
      </div>
    </div>
  );
}