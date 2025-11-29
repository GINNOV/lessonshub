'use client';

import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import StudentFreeLessonCard from '@/app/components/StudentFreeLessonCard';
import { LessonType } from '@prisma/client';

export type FreeLesson = {
  id: string;
  title: string;
  type: LessonType;
  lesson_preview: string | null;
  assignment_image_url: string | null;
  price: number;
  difficulty: number;
  teacher: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
  completionCount: number;
};

interface StudentFreeLessonListProps {
  lessons: FreeLesson[];
}

export default function StudentFreeLessonList({ lessons }: StudentFreeLessonListProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    if (!term) return lessons;
    return lessons.filter((lesson) => {
      const title = lesson.title?.toLowerCase() ?? '';
      const preview = lesson.lesson_preview?.toLowerCase() ?? '';
      return title.includes(term) || preview.includes(term);
    });
  }, [lessons, search]);

  return (
    <div className="space-y-4">
      <Input
        type="search"
        placeholder="Search free lessons..."
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="w-full sm:max-w-md"
      />

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-6 text-center text-gray-600">
          No free lessons available right now.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((lesson) => (
            <StudentFreeLessonCard key={lesson.id} lesson={lesson} />
          ))}
        </div>
      )}
    </div>
  );
}
