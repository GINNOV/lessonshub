// file: src/app/dashboard/create/page.tsx

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import LessonForm from "@/app/components/LessonForm";
import { Role } from "@prisma/client";
import { getTeacherPreferences } from "@/actions/teacherActions"; // Import the new action
import { getInstructionBookletsForTeacher } from "@/actions/instructionBookletActions";

export default async function CreateLessonPage() {
  const session = await auth();

  if (!session || session.user.role !== Role.TEACHER) {
    redirect("/");
  }

  // Fetch teacher preferences to pass to the form
  const [preferences, instructionBooklets] = await Promise.all([
    getTeacherPreferences(),
    getInstructionBookletsForTeacher(),
  ]);
  
  const serializablePreferences = preferences ? {
    ...preferences,
    defaultLessonPrice: preferences.defaultLessonPrice?.toNumber() ?? 0,
  } : null;

  return (
    <div className="flex min-h-screen flex-col items-center p-8 sm:p-24">
      <div className="w-full max-w-lg">
        <h1 className="text-3xl font-bold mb-6">Create a New Lesson</h1>
        <LessonForm
          teacherPreferences={serializablePreferences}
          instructionBooklets={instructionBooklets.map((booklet) => ({
            ...booklet,
            createdAt: booklet.createdAt.toISOString(),
            updatedAt: booklet.updatedAt.toISOString(),
          }))}
        />
      </div>
    </div>
  );
}
