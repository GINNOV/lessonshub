'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AssignmentStatus, LessonType } from '@prisma/client';
import StudentLessonCard from '@/app/components/StudentLessonCard';
import WeekDivider from '@/app/components/WeekDivider';
import { getWeekAndDay } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
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
  composerConfig?: {
    hiddenSentence: string;
  } | null;
  questionCount?: number;
  multiChoiceCount?: number;
};

type SerializableAssignment = {
  id: string;
  status: AssignmentStatus;
  startDate?: Date | string | null;
  assignedAt?: Date | string | null;
  deadline: Date | string;
  originalDeadline: Date | string | null;
  score: number | null;
  pointsAwarded: number;
  answers: any;
  draftAnswers?: any;
  lesson: SerializableLesson;
};

interface StudentLessonListProps {
  assignments: SerializableAssignment[];
  copy?: {
    searchPlaceholder: string;
    empty: string;
    browseTeachers: string;
    card?: React.ComponentProps<typeof StudentLessonCard>['copy'];
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
  const getWeekKey = (date: Date) => {
    const tempDate = new Date(date.valueOf());
    tempDate.setUTCDate(tempDate.getUTCDate() + 4 - (tempDate.getUTCDay() || 7));
    const year = tempDate.getUTCFullYear();
    const yearStart = new Date(Date.UTC(year, 0, 1));
    const weekNo = Math.ceil((((tempDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return { year, weekNo, key: `${year}-${weekNo}` };
  };

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StudentLessonFilter>(externalFilter ?? 'all');
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
    const getAvailabilityDate = (assignment: SerializableAssignment) =>
      assignment.startDate || assignment.assignedAt || assignment.deadline;
    const isAvailable = (assignment: SerializableAssignment) => {
      const availability = new Date(getAvailabilityDate(assignment));
      if (Number.isNaN(availability.getTime())) return true;
      return availability <= now;
    };
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
      .sort(
        (a, b) =>
          new Date(getAvailabilityDate(a)).getTime() - new Date(getAvailabilityDate(b)).getTime(),
      );
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
            const groups = new Map<string, { key: string; weekNo: number; year: number; items: SerializableAssignment[] }>();
            filtered.forEach(a => {
              const availabilityDate = a.startDate || a.assignedAt || a.deadline;
              const { key, weekNo, year } = getWeekKey(new Date(availabilityDate));
              if (!groups.has(key)) {
                groups.set(key, { key, weekNo, year, items: [] });
              }
              groups.get(key)!.items.push(a);
            });
            // Show most recent weeks first
            const orderedWeeks = Array.from(groups.values()).sort((a, b) => {
              if (a.year !== b.year) return b.year - a.year;
              return b.weekNo - a.weekNo;
            });
            let cardIndex = 0;
            const defaultOpen = orderedWeeks.slice(0, 1).map((group) => group.key);
            return (
              <Accordion type="multiple" defaultValue={defaultOpen} className="space-y-4">
                {orderedWeeks.map(group => (
                  <AccordionItem
                    key={group.key}
                    value={group.key}
                    className="rounded-2xl border border-slate-800/70 bg-slate-900/60 px-4 shadow-lg"
                  >
                    <AccordionTrigger className="py-4 text-slate-200 hover:no-underline">
                      <div className="flex w-full flex-wrap items-center justify-between gap-3">
                        <WeekDivider weekNumber={group.weekNo} year={group.year} />
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          {group.items.length} lessons
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-6 pt-2">
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {group.items.map(a => (
                          <StudentLessonCard key={a.id} assignment={a} index={cardIndex++} copy={copy?.card} />
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            );
          })()}
        </div>
      )}
    </div>
  );
}
