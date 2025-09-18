// file: src/app/dashboard/assign/[lessonId]/page.tsx

import { redirect } from 'next/navigation';
import { auth } from "@/auth";
import { getLessonById, getSubmissionsForLesson, getStudentsWithStats } from "@/actions/lessonActions";
import AssignLessonForm from '@/app/components/AssignLessonForm';
import { Role } from '@prisma/client';

export default async function AssignPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const session = await auth();

  if (!session || session.user.role !== Role.TEACHER) {
    redirect('/');
  }

  const { lessonId } = await params;
  
  const [lesson, students, existingAssignments] = await Promise.all([
    getLessonById(lessonId),
    getStudentsWithStats(session.user.id), 
    getSubmissionsForLesson(lessonId, session.user.id)
  ]);

  if (!lesson) {
    return <div>Lesson not found.</div>;
  }

  const serializableLesson = {
    ...lesson,
    price: lesson.price.toNumber(),
  };

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-4xl">
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
