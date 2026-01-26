// file: src/app/components/LessonTable.tsx
'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Assignment, LessonType } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { reassignLesson } from '@/actions/adminActions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Check, Loader2, Search, UserX } from 'lucide-react';
import LessonPriceEditor from './LessonPriceEditor';

type SerializableUser = Omit<User, 'defaultLessonPrice'> & {
    defaultLessonPrice: number | null;
};

export type SerializableLesson = {
  id: string;
  title: string;
  type: LessonType;
  price: number;
  teacher: SerializableUser | null;
  assignments: Assignment[];
};

interface LessonTableProps {
  lessons: SerializableLesson[];
  teachers: SerializableUser[];
  searchTerm: string;
}

export default function LessonTable({
  lessons,
  teachers,
  searchTerm,
}: LessonTableProps) {
  const router = useRouter();
  const [pendingLessonId, setPendingLessonId] = useState<string | null>(null);
  const [localLessons, setLocalLessons] = useState(lessons);
  const [search, setSearch] = useState(searchTerm);
  const [isRefreshing, startTransition] = useTransition();

  useEffect(() => {
    setLocalLessons(lessons);
  }, [lessons]);

  const handleReassign = async (
    lessonId: string,
    newTeacher: SerializableUser | null
  ) => {
    setPendingLessonId(lessonId);
    try {
      const result = await reassignLesson(lessonId, newTeacher?.id ?? null);
      if (result?.success === false) {
        throw new Error(result.error || 'Failed to update lesson assignment.');
      }

      setLocalLessons((prev) =>
        prev.map((lesson) =>
          lesson.id === lessonId ? { ...lesson, teacher: newTeacher } : lesson
        )
      );
      toast.success(
        newTeacher
          ? `Assigned to ${newTeacher.name || newTeacher.email || 'teacher'}.`
          : 'Teacher unassigned.'
      );
      startTransition(() => router.refresh());
    } catch (error) {
      console.error(error);
      toast.error('Unable to update teacher assignment.');
    } finally {
      setPendingLessonId(null);
    }
  };

  const getEditLink = (lesson: SerializableLesson) => {
    switch (lesson.type) {
        case LessonType.FLASHCARD:
            return `/dashboard/edit/flashcard/${lesson.id}`;
        case LessonType.MULTI_CHOICE:
            return `/dashboard/edit/multi-choice/${lesson.id}`;
        case LessonType.LYRIC:
            return `/dashboard/edit/lyric/${lesson.id}`;
        case LessonType.ARKANING:
            return `/dashboard/edit/arkaning/${lesson.id}`;
        case LessonType.NEWS_ARTICLE:
            return `/dashboard/edit/news-article/${lesson.id}`;
        default:
            return `/dashboard/edit/${lesson.id}`;
    }
  }

  const dedupedTeachers = useMemo(() => {
    const unique = new Map<string, SerializableUser>();
    teachers.forEach((teacher) => {
      if (!unique.has(teacher.id)) unique.set(teacher.id, teacher);
    });
    return Array.from(unique.values());
  }, [teachers]);

  const filteredLessons = useMemo(() => localLessons.filter(
    (lesson) =>
      lesson.title.toLowerCase().includes(search.toLowerCase()) ||
      lesson.teacher?.name?.toLowerCase().includes(search.toLowerCase()) ||
      lesson.teacher?.email?.toLowerCase().includes(search.toLowerCase())
  ), [localLessons, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <Input
            type="search"
            placeholder="Search by lesson or teacher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9"
          />
        </div>
        {isRefreshing && (
          <div className="flex items-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Syncing
          </div>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                Title
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                Type
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                Price (€)
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                Assigned Teacher
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                # Students Assigned
              </th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {filteredLessons.map((lesson) => {
              const isPending = pendingLessonId === lesson.id;
              return (
                <tr key={lesson.id}>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    {lesson.title}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {lesson.type}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    <LessonPriceEditor
                      lessonId={lesson.id}
                      initialPrice={lesson.price}
                    />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {lesson.teacher?.name || lesson.teacher?.email || (
                      <span className="italic text-gray-400">Unassigned</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {lesson.assignments.length}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" disabled={isPending}>
                          {isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Updating…
                            </>
                          ) : (
                            'Actions'
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-64">
                        <DropdownMenuLabel>Lesson</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                          <Link href={getEditLink(lesson)}>Edit</Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Assign teacher</DropdownMenuLabel>
                        {dedupedTeachers.map((teacher) => {
                          const isCurrent = lesson.teacher?.id === teacher.id;
                          return (
                            <DropdownMenuItem
                              key={teacher.id}
                              onSelect={() => handleReassign(lesson.id, teacher)}
                              disabled={isPending || isCurrent}
                              className="flex items-center justify-between gap-2"
                            >
                              <span className="truncate">
                                {teacher.name || teacher.email || 'Unnamed teacher'}
                              </span>
                              {isCurrent && <Check className="h-4 w-4 text-emerald-600" />}
                            </DropdownMenuItem>
                          );
                        })}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onSelect={() => handleReassign(lesson.id, null)}
                          disabled={isPending || !lesson.teacher}
                          className="flex items-center gap-2 text-red-600 focus:text-red-600"
                        >
                          <UserX className="h-4 w-4" />
                          Unassign teacher
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
