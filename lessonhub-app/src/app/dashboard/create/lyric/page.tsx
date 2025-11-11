import LyricLessonEditor from "@/app/components/LyricLessonEditor";
import { getTeacherPreferences } from "@/actions/teacherActions";
import { getInstructionBookletsForTeacher } from "@/actions/instructionBookletActions";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";

export default async function CreateLyricLessonPage() {
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
    <div className="flex min-h-screen flex-col items-center p-8 sm:p-16">
      <div className="w-full max-w-4xl space-y-6">
        <h1 className="text-3xl font-bold">Create Lyric Lesson</h1>
        <LyricLessonEditor
          teacherPreferences={serializablePreferences}
          instructionBooklets={instructionBooklets.map(booklet => ({
            id: booklet.id,
            title: booklet.title,
            body: booklet.body,
          }))}
        />
      </div>
    </div>
  );
}
