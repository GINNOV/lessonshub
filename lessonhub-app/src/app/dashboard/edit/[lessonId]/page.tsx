// file: src/app/dashboard/edit/[lessonId]/page.tsx

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLessonById } from "@/actions/lessonActions";
import LessonForm from "@/app/components/LessonForm";
import { Role, LessonType } from "@prisma/client";

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

  // --- Dispatcher Logic ---
  // Redirect to the specific editor based on the lesson type
  if (lesson.type === LessonType.FLASHCARD) {
    redirect(`/dashboard/edit/flashcard/${lessonId}`);
  }
  if (lesson.type === LessonType.MULTI_CHOICE) {
    redirect(`/dashboard/edit/multi-choice/${lessonId}`);
  }
  // Future lesson types can be added here, e.g.,
  // if (lesson.type === LessonType.LEARNING_SESSION) {
  //   redirect(`/dashboard/edit/learning-session/${lessonId}`);
  // }

  // If the type is STANDARD (or default), render the standard lesson form
  return (
    <div className="flex min-h-screen flex-col items-center p-8 sm:p-24">
      <div className="w-full max-w-lg">
        <h1 className="text-3xl font-bold mb-6">Edit Lesson</h1>
        <LessonForm lesson={lesson} />
      </div>
    </div>
  );
}