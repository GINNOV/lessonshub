'use client';

import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import StudentFreeLessonCard from '@/app/components/StudentFreeLessonCard';
import { LessonType } from '@prisma/client';
import { Search } from 'lucide-react';

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
  copy?: {
    searchPlaceholder: string;
    emptyFree: string;
  };
}

export default function StudentFreeLessonList({ lessons, copy }: StudentFreeLessonListProps) {
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
      <div className="relative w-full sm:max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
        <Input
          type="search"
          placeholder={copy?.searchPlaceholder || "Search free lessons..."}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-6 text-center text-gray-600">
          {copy?.emptyFree || "No free lessons available right now."}
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
