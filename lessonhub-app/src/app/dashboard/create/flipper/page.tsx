// file: src/app/dashboard/create/flipper/page.tsx
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import { getTeacherPreferences } from '@/actions/teacherActions';
import { getInstructionBookletsForTeacher } from '@/actions/instructionBookletActions';
import FlipperLessonCreator from '@/app/components/FlipperLessonCreator';
import Link from 'next/link';

export default async function CreateFlipperLessonPage() {
  const session = await auth();
  if (!session || session.user.role !== Role.TEACHER) {
    redirect('/');
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

  return (
    <div className="flex min-h-screen flex-col items-center p-8 sm:p-24">
      <div className="w-full max-w-3xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-3xl font-bold">Create Flipper Lesson</h1>
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
          teacherPreferences={serializablePreferences}
          instructionBooklets={instructionBooklets.map((booklet) => ({
            ...booklet,
            createdAt: booklet.createdAt.toISOString(),
            updatedAt: booklet.updatedAt.toISOString(),
          }))}
        />
      </div>
    </div>
  );
}
