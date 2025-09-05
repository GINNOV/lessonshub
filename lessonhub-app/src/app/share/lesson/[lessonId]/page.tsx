// file: src/app/share/lesson/[lessonId]/page.tsx

import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getLessonForSharePage, assignLessonToStudent } from '@/actions/lessonActions';
import { Role } from '@prisma/client';

export default async function ShareLessonPage({ params }: { params: { lessonId: string } }) {
  const session = await auth();
  const { lessonId } = params;

  if (!session) {
    // If not signed in, redirect to sign-in, then come back to this page.
    const callbackUrl = `/share/lesson/${lessonId}`;
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  const lesson = await getLessonForSharePage(lessonId);

  if (!lesson) {
    return <div>Lesson not found.</div>;
  }

  // If the user is a student, assign the lesson to them
  if (session.user.role === Role.STUDENT) {
    const assignment = await assignLessonToStudent(lessonId, session.user.id);
    if (assignment) {
      redirect(`/assignments/${assignment.id}`);
    } else {
      // Handle case where assignment fails (e.g., already assigned)
      redirect('/my-lessons');
    }
  }

  // If the user is a teacher or admin, redirect to the lesson edit page
  if (session.user.role === Role.TEACHER || session.user.role === Role.ADMIN) {
    redirect(`/dashboard/edit/${lessonId}`);
  }

  // Fallback redirect
  redirect('/');
}