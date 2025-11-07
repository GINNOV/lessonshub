// file: src/app/dashboard/settings/page.tsx

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import TeacherPreferences from "@/app/components/TeacherPreferences";
import { Button } from "@/components/ui/button";

export default async function TeacherSettingsPage() {
  const session = await auth();

  if (!session) {
    redirect("/signin");
  }

  if (session.user.role !== Role.TEACHER) {
    redirect("/dashboard");
  }

  const teacher = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!teacher) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-4">Lesson Defaults</h1>
        <p className="text-red-600">Unable to load your preferences. Please try again later.</p>
      </div>
    );
  }

  const serializableTeacher = {
    ...teacher,
    defaultLessonPrice: teacher.defaultLessonPrice
      ? Number(teacher.defaultLessonPrice.toString())
      : null,
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-3xl font-bold">Lesson Defaults</h1>
        <p className="mt-1 text-gray-600">
          Set the values that pre-fill when you create new lessons across every lesson type.
        </p>
      </div>
      <TeacherPreferences teacher={serializableTeacher as any} />
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold">Instruction Booklets</h2>
        <p className="mt-2 text-gray-600">
          Create reusable instruction sets once and drop them into any lesson. Manage them without
          opening the lesson creator.
        </p>
        <div className="mt-4">
          <Button asChild>
            <Link href="/dashboard/instructions">Open Instruction Booklets</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
