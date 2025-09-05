// file: src/app/dashboard/assign/[lessonId]/page.tsx

// Corrected Imports
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
  
  // Fetch all necessary data in parallel for better performance
  const [lesson, students, existingAssignments] = await Promise.all([
    getLessonById(lessonId),
    getStudentsWithStats(), 
    getSubmissionsForLesson(lessonId, session.user.id)
  ]);

  if (!lesson) {
    return <div>Lesson not found.</div>;
  }

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-4xl"> {/* Increased max-width for the table */}
        <h1 className="text-3xl font-bold mb-2">Assign Lesson</h1>
        <h2 className="text-xl text-gray-600 mb-6">{lesson.title}</h2>
        <AssignLessonForm 
          lesson={lesson} 
          students={students} 
          existingAssignments={existingAssignments} 
        />
      </div>
    </div>
  );
}