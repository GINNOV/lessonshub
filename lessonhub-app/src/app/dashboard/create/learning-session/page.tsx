// file: src/app/dashboard/create/learning-session/page.tsx

import LearningSessionCreator from "@/app/components/LearningSessionCreator";
import { getTeacherPreferences } from "@/actions/teacherActions";
import { getInstructionBookletsForTeacher } from "@/actions/instructionBookletActions";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";

export default async function CreateLearningSessionPage() {
  const session = await auth();
  if (!session || session.user.role !== Role.TEACHER) {
    redirect('/');
  }

  const [preferences, instructionBooklets] = await Promise.all([
    getTeacherPreferences(),
    getInstructionBookletsForTeacher(),
  ]);

  const serializablePreferences = preferences
    ? {
        ...preferences,
        defaultLessonPrice: preferences.defaultLessonPrice?.toNumber() ?? 0,
      }
    : null;

  return (
    <div className="flex min-h-screen flex-col items-center p-8 sm:p-16">
      <div className="w-full max-w-3xl">
        <h1 className="text-3xl font-bold mb-6">Create a Learning Session</h1>
        <LearningSessionCreator
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
