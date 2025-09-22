// file: src/app/dashboard/assign/[lessonId]/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLessonById, getStudentsWithStats } from "@/actions/lessonActions";
import AssignLessonForm from "@/app/components/AssignLessonForm";
import { Role } from "@prisma/client";
import prisma from "@/lib/prisma";

export default async function AssignPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== Role.TEACHER) {
    redirect("/signin");
  }

  const { lessonId } = await params;
  const lesson = await getLessonById(lessonId);

  if (!lesson) {
    return <div>Lesson not found.</div>;
  }
  
  const serializableLesson = {
      ...lesson,
      price: lesson.price.toNumber(),
  };

  
  const [students, existingAssignments] = await Promise.all([
    getStudentsWithStats(session.user.id),
    prisma.assignment.findMany({ where: { lessonId } }),
  ]);

  return (
    <div className="container mx-auto p-4">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold mb-2">Assign Lesson</h1>
        <h2 className="text-xl text-gray-600 mb-6">{lesson.title}</h2>
        <AssignLessonForm 
          lesson={serializableLesson} 
          students={students} 
          existingAssignments={existingAssignments} 
        />
      </div>
    </div>
  );
}

