// file: src/app/dashboard/edit/[lessonId]/page.tsx

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLessonById } from "@/actions/lessonActions";
import LessonForm from "@/app/components/LessonForm";
import { Role } from "@prisma/client";

export default async function EditLessonPage({ params }: { params: { lessonId: string } }) {
  const session = await auth();

  if (!session || session.user.role !== Role.TEACHER) {
    redirect("/");
  }

  const { lessonId } = params;
  const lesson = await getLessonById(lessonId);

  // Optional: Add a check to ensure the lesson belongs to the teacher if needed,
  // though the API route provides the main security for the update itself.

  if (!lesson) {
    return <div>Lesson not found.</div>;
  }

  return (
    <div className="flex min-h-screen flex-col items-center p-8 sm:p-24">
      <div className="w-full max-w-lg">
        <h1 className="text-3xl font-bold mb-6">Edit Lesson</h1>
        <LessonForm lesson={lesson} />
      </div>
    </div>
  );
}