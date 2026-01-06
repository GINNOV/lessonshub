'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AssignmentStatus, LessonType } from '@prisma/client';
import StudentLessonCard from '@/app/components/StudentLessonCard';
import WeekDivider from '@/app/components/WeekDivider';
import { getWeekAndDay } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import Link from 'next/link';

export type StudentLessonFilter = 'all' | 'pending' | 'submitted' | 'graded' | 'past_due' | 'failed';

type SerializableUser = {
  id: string;
  name: string | null;
  image: string | null;
  defaultLessonPrice: number | null;
};

type SerializableLesson = {
  id: string;
  title: string;
  type: LessonType;
  lesson_preview: string | null;
  assignment_image_url: string | null;
  price: number;
  isFreeForAll?: boolean;
  guideIsFreeForAll?: boolean;
  public_share_id: string | null;
  submittedCount: number;
  teacher: SerializableUser | null;
  completionCount: number;
  difficulty: number;
};

type SerializableAssignment = {
  id: string;
  status: AssignmentStatus;
  deadline: Date | string;
  originalDeadline: Date | string | null;
  score: number | null;
  pointsAwarded: number;
  answers: any;
  lesson: SerializableLesson;
};

interface StudentLessonListProps {
  assignments: SerializableAssignment[];
  copy?: {
    searchPlaceholder: string;
    empty: string;
    browseTeachers: string;
  };
  filter?: StudentLessonFilter;
  onFilterChange?: (filter: StudentLessonFilter) => void;
}

export default function StudentLessonList({
  assignments,
  copy,
  filter: externalFilter,
  onFilterChange,
}: StudentLessonListProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StudentLessonFilter>(externalFilter ?? 'pending');
  useEffect(() => {
    if (externalFilter && externalFilter !== filter) {
      setFilter(externalFilter);
    }
  }, [externalFilter, filter]);

  const handleFilterChange = (nextFilter: StudentLessonFilter) => {
    setFilter(nextFilter);
    onFilterChange?.(nextFilter);
  };

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    const now = new Date();
    return (assignments || [])
      .filter(a => {
        // Status filter (only keep the requested ones)
        if (filter === 'pending') return a.status === AssignmentStatus.PENDING && new Date(a.deadline) > now;
        if (filter === 'submitted') return a.status === AssignmentStatus.COMPLETED;
        if (filter === 'graded') return a.status === AssignmentStatus.GRADED;
        if (filter === 'past_due') return a.status === AssignmentStatus.PENDING && new Date(a.deadline) <= now;
        if (filter === 'failed') return a.status === AssignmentStatus.FAILED;
        return true; // all
      })
      .filter(a => {
        if (!term) return true;
        const title = a.lesson.title?.toLowerCase() || '';
        const teacher = a.lesson.teacher?.name?.toLowerCase() || '';
        return title.includes(term) || teacher.includes(term);
      })
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
  }, [assignments, filter, search]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 shadow-lg backdrop-blur-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative w-full md:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
            <Input
              type="search"
              placeholder={copy?.searchPlaceholder || "Search by title or teacher..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950/60 pl-10 text-slate-100 placeholder:text-slate-500 focus:border-teal-400 focus:ring-2 focus:ring-teal-500/50"
            />
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-8 text-center text-slate-300 shadow-inner">
          <p>{copy?.empty || "You have no assignments yet."}</p>
          <div className="mt-3 text-sm">
            <Link
              href="/teachers"
              className="font-semibold text-teal-300 underline decoration-dotted underline-offset-4 hover:text-teal-200"
            >
              {copy?.browseTeachers || "Browse teachers directory"}
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {(() => {
            const groups = new Map<number, SerializableAssignment[]>();
            filtered.forEach(a => {
              const week = parseInt(getWeekAndDay(new Date(a.deadline)).split('-')[0], 10);
              if (!groups.has(week)) groups.set(week, []);
              groups.get(week)!.push(a);
            });
            // Show most recent weeks first
            const orderedWeeks = Array.from(groups.keys()).sort((a, b) => b - a);
            let cardIndex = 0;
            return orderedWeeks.map(week => (
              <div key={week} className="space-y-4">
                <WeekDivider weekNumber={week} />
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {groups.get(week)!.map(a => (
                    <StudentLessonCard key={a.id} assignment={a} index={cardIndex++} />
                  ))}
                </div>
              </div>
            ));
          })()}
        </div>
      )}
    </div>
  );
}
