// file: src/app/dashboard/create/news-article/page.tsx
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import Link from 'next/link';
import { getTeacherPreferences } from '@/actions/teacherActions';
import { getInstructionBookletsForTeacher } from '@/actions/instructionBookletActions';
import NewsArticleLessonCreator from '@/app/components/NewsArticleLessonCreator';

export default async function CreateNewsArticleLessonPage() {
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
  const serializableBooklets = instructionBooklets.map((booklet) => ({
    ...booklet,
    createdAt: booklet.createdAt.toISOString(),
    updatedAt: booklet.updatedAt.toISOString(),
  }));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-3xl font-bold">Create News Article Lesson</h1>
        <Link
          className="text-sm font-semibold text-teal-500 hover:text-teal-400"
          href="/docs/teachers/lesson-editors/news-article"
          rel="noreferrer"
          target="_blank"
        >
          Lesson editor docs
        </Link>
      </div>
      <NewsArticleLessonCreator
        teacherPreferences={serializablePreferences}
        instructionBooklets={serializableBooklets}
      />
    </div>
  );
}
