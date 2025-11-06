// file: src/app/dashboard/edit/[lessonId]/page.tsx

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLessonById } from "@/actions/lessonActions";
import LessonForm from "@/app/components/LessonForm";
import { Role, LessonType } from "@prisma/client";
import FlashcardCreator from "@/app/components/FlashcardCreator";
import MultiChoiceCreator from "@/app/components/MultiChoiceCreator";
import { getTeacherPreferences } from "@/actions/teacherActions";
import { getInstructionBookletsForTeacher } from "@/actions/instructionBookletActions";

export default async function EditLessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const session = await auth();

  if (!session || session.user.role !== Role.TEACHER) {
    redirect("/");
  }

  const { lessonId } = await params;
  const lesson = await getLessonById(lessonId);

  if (!lesson) {
    return <div>Lesson not found.</div>;
  }

  if (lesson.type === LessonType.LYRIC) {
    redirect(`/dashboard/edit/lyric/${lessonId}`);
  }
  
  const [preferences, instructionBooklets] = await Promise.all([
    getTeacherPreferences(),
    getInstructionBookletsForTeacher(),
  ]);
    
  const serializablePreferences = preferences ? {
      ...preferences,
      defaultLessonPrice: preferences.defaultLessonPrice?.toNumber() ?? 0,
  } : null;

  const serializablePreferences = preferences ? {
      ...preferences,
      defaultLessonPrice: preferences.defaultLessonPrice?.toNumber() ?? 0,
  } : null;

  const serializableBooklets = instructionBooklets.map((booklet) => ({
    ...booklet,
    createdAt: booklet.createdAt.toISOString(),
    updatedAt: booklet.updatedAt.toISOString(),
  }));

  const serializableLesson = {
    ...lesson,
    price: lesson.price.toNumber(),
  };

  return (
    <div className="flex min-h-screen flex-col items-center p-8 sm:p-24">
      <div className="w-full max-w-lg">
        <h1 className="text-3xl font-bold mb-6">Edit Lesson</h1>
        {lesson.type === LessonType.STANDARD && (
          <LessonForm
            lesson={serializableLesson}
            teacherPreferences={serializablePreferences}
            instructionBooklets={serializableBooklets}
          />
        )}
        {lesson.type === LessonType.FLASHCARD && (
          <FlashcardCreator
            lesson={serializableLesson}
            teacherPreferences={serializablePreferences}
            instructionBooklets={serializableBooklets}
          />
        )}
        {lesson.type === LessonType.MULTI_CHOICE && (
          <MultiChoiceCreator
            lesson={serializableLesson}
            teacherPreferences={serializablePreferences}
            instructionBooklets={serializableBooklets}
          />
        )}
      </div>
    </div>
  );
}
