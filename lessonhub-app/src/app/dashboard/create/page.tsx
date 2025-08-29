// file: app/dashboard/create/page.tsx

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Using alias @
import { redirect } from "next/navigation";
import CreateLessonForm from "@/app/components/CreateLessonForm";

export default async function CreateLessonPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen flex-col items-center p-8 sm:p-24">
      <div className="w-full max-w-lg">
        <h1 className="text-3xl font-bold mb-6">Create a New Lesson</h1>
        <CreateLessonForm />
      </div>
    </div>
  );
}