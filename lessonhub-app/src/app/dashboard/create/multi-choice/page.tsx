// file: src/app/dashboard/create/multi-choice/page.tsx
import MultiChoiceCreator from "@/app/components/MultiChoiceCreator";
import { getTeacherPreferences } from "@/actions/teacherActions";
import { getInstructionBookletsForTeacher } from "@/actions/instructionBookletActions";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";

export default async function CreateMultiChoicePage() {
  const session = await auth();

  if (!session || session.user.role !== Role.TEACHER) {
    redirect("/");
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
    <div>
      <h1 className="text-3xl font-bold mb-6">Create Multi-Choice Lesson</h1>
      <MultiChoiceCreator
        teacherPreferences={serializablePreferences}
        instructionBooklets={instructionBooklets.map((booklet) => ({
          ...booklet,
          createdAt: booklet.createdAt.toISOString(),
          updatedAt: booklet.updatedAt.toISOString(),
        }))}
      />
    </div>
  );
}
