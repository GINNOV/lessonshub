// file: src/app/admin/lessons/page.tsx
import { redirect } from "next/navigation";
import Link from "next/link";
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
  const hasAdminAccess = session && (session.user.role === Role.ADMIN || session.user.hasAdminPortalAccess);
  if (!hasAdminAccess) {
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
    <div className="space-y-6 text-slate-100">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="mb-2 text-3xl font-bold">Lesson Management</h1>
          <p className="text-slate-400">Search and manage lessons across the platform.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin"
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-100 hover:border-teal-400/60"
          >
            ← Admin home
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-100 hover:border-teal-400/60"
          >
            ← Teacher dashboard
          </Link>
        </div>
      </div>
      <div className="rounded-xl border border-slate-800/70 bg-slate-900/70 p-6 shadow-xl backdrop-blur">
        <LessonTable
          lessons={serializableLessons}
          teachers={serializableTeachers}
          searchTerm={searchTerm}
        />
      </div>
    </div>
  );
}
