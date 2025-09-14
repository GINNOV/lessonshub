// file: src/app/share/lesson/[shareId]/page.tsx
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { assignLessonByShareId } from '@/actions/lessonActions';
import { Role } from '@prisma/client';

export default async function JoinLessonPage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const session = await auth();
  const { shareId } = await params;

  // If user is not signed in, redirect them to the sign-in page.
  // After signing in, they will be sent back to this exact "Join" link to complete the process.
  if (!session) {
    const callbackUrl = `/share/lesson/${shareId}`;
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  // If the user is a Teacher or Admin, they can't "join" a lesson as a student.
  // Redirect them to their dashboard to prevent confusion.
  if (session.user.role === Role.TEACHER || session.user.role === Role.ADMIN) {
    redirect('/dashboard');
  }

  // If the user is a Student, attempt to assign the lesson.
  if (session.user.role === Role.STUDENT) {
    const assignment = await assignLessonByShareId(shareId, session.user.id);

    if (assignment) {
      // Success! Redirect the student directly to their new assignment.
      redirect(`/assignments/${assignment.id}`);
    } else {
      // Failure, likely because the share link was invalid.
      // Redirect to their main dashboard.
      // We could add a toast message here in the future to say "Invalid Link".
      redirect('/my-lessons');
    }
  }

  // Fallback for any other unforeseen cases.
  redirect('/');
}