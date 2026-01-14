// file: src/app/dashboard/edit/[lessonId]/page.tsx

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLessonById } from "@/actions/lessonActions";
import LessonForm from "@/app/components/LessonForm";
import { Role, LessonType } from "@prisma/client";
import FlashcardCreator from "@/app/components/FlashcardCreator";
import MultiChoiceCreator from "@/app/components/MultiChoiceCreator";
import LearningSessionCreator from "@/app/components/LearningSessionCreator";
import ComposerLessonCreator from "@/app/components/ComposerLessonCreator";
import { getTeacherPreferences } from "@/actions/teacherActions";
import { getInstructionBookletsForTeacher } from "@/actions/instructionBookletActions";
import { hasAdminPrivileges } from "@/lib/authz";
import Link from "next/link";

export default async function EditLessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const session = await auth();
  const isAdminLike = hasAdminPrivileges(session?.user);

  if (!session) {
    redirect("/signin");
  }

  if (session.user.role === Role.STUDENT) {
    redirect("/");
  }

  if (session.user.role !== Role.TEACHER && !isAdminLike) {
    redirect("/");
  }

  const { lessonId } = await params;
  const lesson = await getLessonById(lessonId);

  if (!lesson) {
    return <div>Lesson not found.</div>;
  }

  if (lesson.teacherId && lesson.teacherId !== session.user.id && !isAdminLike) {
    redirect("/dashboard");
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

  const serializableBooklets = instructionBooklets.map((booklet) => ({
    ...booklet,
    createdAt: booklet.createdAt.toISOString(),
    updatedAt: booklet.updatedAt.toISOString(),
  }));

  const serializableLesson = {
    ...lesson,
    price: lesson.price.toNumber(),
  };
  const editorDocHref = (() => {
    switch (lesson.type) {
      case LessonType.STANDARD:
        return "/docs/teachers/lesson-editors/standard";
      case LessonType.FLASHCARD:
        return "/docs/teachers/lesson-editors/flashcard";
      case LessonType.MULTI_CHOICE:
        return "/docs/teachers/lesson-editors/multi-choice";
      case LessonType.LEARNING_SESSION:
        return "/docs/teachers/lesson-editors/guide";
      case LessonType.COMPOSER:
        return "/docs/teachers/lesson-editors/composer";
      default:
        return "/docs/teachers/lesson-editors/standard";
    }
  })();

  return (
    <div className="flex min-h-screen flex-col items-center p-8 sm:p-24">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-3xl font-bold">Edit Lesson</h1>
          <Link
            className="text-sm font-semibold text-teal-500 hover:text-teal-400"
            href={editorDocHref}
            rel="noreferrer"
            target="_blank"
          >
            Lesson editor docs
          </Link>
        </div>
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
        {lesson.type === LessonType.LEARNING_SESSION && (
          <LearningSessionCreator
            lesson={serializableLesson}
            teacherPreferences={serializablePreferences}
            instructionBooklets={serializableBooklets}
          />
        )}
        {lesson.type === LessonType.COMPOSER && (
          <ComposerLessonCreator
            lesson={serializableLesson as any}
            teacherPreferences={serializablePreferences}
            instructionBooklets={serializableBooklets}
          />
        )}
      </div>
    </div>
  );
}
