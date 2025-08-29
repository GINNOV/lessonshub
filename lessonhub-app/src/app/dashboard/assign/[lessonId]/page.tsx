// file: src/app/dashboard/assign/[lessonId]/page.tsx

import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getLessonById, getAllStudents } from '@/app/actions/lessonActions';
import AssignLessonForm from '@/app/components/AssignLessonForm';

// Notice the change in the function signature
export default async function AssignPage({ params }: { params: { lessonId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/');
  }

  // Destructure lessonId from params here
  const { lessonId } = params;

  const lesson = await getLessonById(lessonId); // Use the variable
  const students = await getAllStudents();

  if (!lesson) {
    return <div>Lesson not found.</div>;
  }

  return (
    <div className="flex min-h-screen flex-col items-center p-8 sm:p-24">
      <div className="w-full max-w-lg">
        <h1 className="text-3xl font-bold mb-2">Assign Lesson</h1>
        <h2 className="text-xl text-gray-600 mb-6">{lesson.title}</h2>
        <AssignLessonForm lesson={lesson} students={students} />
      </div>
    </div>
  );
}