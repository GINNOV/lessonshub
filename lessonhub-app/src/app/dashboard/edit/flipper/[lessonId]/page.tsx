// file: src/app/dashboard/edit/flipper/[lessonId]/page.tsx
import { getLessonById } from '@/actions/lessonActions';
import FlipperLessonCreator from '@/app/components/FlipperLessonCreator';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getTeacherPreferences } from '@/actions/teacherActions';
import { getInstructionBookletsForTeacher } from '@/actions/instructionBookletActions';
import { auth } from '@/auth';
import { hasAdminPrivileges } from '@/lib/authz';
import { Role } from '@prisma/client';

export default async function EditFlipperLessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const session = await auth();
  const isAdminLike = hasAdminPrivileges(session?.user);

  if (!session) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold">Please sign in</h1>
        <Button asChild className="mt-4">
          <Link href="/signin">Go to sign in</Link>
        </Button>
      </div>
    );
  }

  if (session.user.role === Role.STUDENT || (session.user.role !== Role.TEACHER && !isAdminLike)) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold">Unauthorized</h1>
        <Button asChild className="mt-4">
          <Link href="/">Return home</Link>
        </Button>
      </div>
    );
  }

  const { lessonId } = await params;
  const lesson = await getLessonById(lessonId);

  if (!lesson) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold">Lesson Not Found</h1>
        <p>The lesson you are trying to edit could not be found.</p>
        <Button asChild className="mt-4">
          <Link href="/dashboard">Return to Dashboard</Link>
        </Button>
      </div>
    );
  }

  if (lesson.teacherId && lesson.teacherId !== session.user.id && !isAdminLike) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold">Unauthorized</h1>
        <p>You can only edit your own lessons.</p>
        <Button asChild className="mt-4">
          <Link href="/dashboard">Return to Dashboard</Link>
        </Button>
      </div>
    );
  }

  const [preferences, instructionBooklets] = await Promise.all([
    getTeacherPreferences(),
    getInstructionBookletsForTeacher(),
  ]);

  const serializablePreferences = preferences
    ? {
        ...preferences,
        defaultLessonPrice: preferences.defaultLessonPrice?.toNumber() ?? 0,
      }
    : null;

  const serializableBooklets = instructionBooklets.map((booklet) => ({
    ...booklet,
    createdAt: booklet.createdAt.toISOString(),
    updatedAt: booklet.updatedAt.toISOString(),
  }));

  const serializableLesson = {
    ...lesson,
    price: lesson.price.toNumber(),
    flipperConfig: lesson.flipperConfig
      ? {
          attemptsBeforePenalty: lesson.flipperConfig.attemptsBeforePenalty ?? 3,
        }
      : null,
    flipperTiles: Array.isArray(lesson.flipperTiles) ? lesson.flipperTiles : [],
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-3xl font-bold">Edit Flipper Lesson</h1>
        <Link
          className="text-sm font-semibold text-teal-500 hover:text-teal-400"
          href="/docs/teachers/lesson-editors/flipper"
          rel="noreferrer"
          target="_blank"
        >
          Lesson editor docs
        </Link>
      </div>
      <FlipperLessonCreator
        lesson={serializableLesson}
        teacherPreferences={serializablePreferences}
        instructionBooklets={serializableBooklets}
      />
    </div>
  );
}
