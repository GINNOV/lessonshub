// file: src/app/dashboard/create/page.tsx

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import LessonForm from "@/app/components/LessonForm"; // <-- UPDATED IMPORT
import { Role } from "@prisma/client"; 

export default async function CreateLessonPage() {
  const session = await auth();

  if (!session || session.user.role !== Role.TEACHER) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen flex-col items-center p-8 sm:p-24">
      <div className="w-full max-w-lg">
        <h1 className="text-3xl font-bold mb-6">Create a New Lesson</h1>
        <LessonForm /> {/* <-- UPDATED COMPONENT */}
      </div>
    </div>
  );
}