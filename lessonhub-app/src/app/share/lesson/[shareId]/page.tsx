import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Role } from '@prisma/client';
import { auth } from '@/auth';
import LessonContentView from '@/app/components/LessonContentView';
import { getLessonByShareId } from '@/actions/lessonActions';
import prisma from '@/lib/prisma';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ShareLessonPageProps {
  params: { shareId: string };
}

export default async function ShareLessonPage({ params }: ShareLessonPageProps) {
  const { shareId } = params;
  const [lesson, session] = await Promise.all([
    getLessonByShareId(shareId),
    auth(),
  ]);

  if (!lesson) {
    notFound();
  }

  const isStudent = session?.user?.role === Role.STUDENT;

  const studentId = isStudent ? session?.user?.id : null;

  const assignment = studentId
    ? await prisma.assignment.findFirst({
        where: { lessonId: lesson.id, studentId },
        select: { id: true },
      })
    : null;

  const viewOnly = !assignment;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-10">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          <Badge variant="outline">Shared lesson</Badge>
          {viewOnly ? (
            <Badge variant="secondary">View only</Badge>
          ) : (
            <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Assigned</Badge>
          )}
        </div>
        <div>
          <h1 className="text-3xl font-bold">{lesson.title}</h1>
          {lesson.teacher?.name && (
            <p className="text-sm text-muted-foreground">Created by {lesson.teacher.name}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-dashed border-muted bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {viewOnly
            ? isStudent
              ? 'You can review the lesson below. A teacher must assign it before you can submit work.'
              : 'This shared lesson is read-only. Sign in as the assigned student to work on it.'
            : 'You are assigned to this lesson. Review the material and open your assignment when you are ready.'}
        </p>
        <div className="flex gap-2">
          {assignment ? (
            <Button asChild>
              <Link href={`/assignments/${assignment.id}`}>Open assignment</Link>
            </Button>
          ) : !session ? (
            <Button variant="secondary" asChild>
              <Link href="/signin">Sign in</Link>
            </Button>
          ) : null}
        </div>
      </div>

      <LessonContentView lesson={lesson} />
    </div>
  );
}
