'use client';

import React, { useMemo, useState } from 'react';
import { AssignmentStatus, LessonType } from '@prisma/client';
import StudentLessonCard from '@/app/components/StudentLessonCard';
import WeekDivider from '@/app/components/WeekDivider';
import { getWeekAndDay } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import Link from 'next/link';
import { Switch } from '@/components/ui/switch';

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
    filters: { all: string; pending: string; graded: string; failed: string };
    freeToggle: string;
    empty: string;
    browseTeachers: string;
  };
}

export default function StudentLessonList({ assignments, copy }: StudentLessonListProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'graded' | 'failed'>('pending');
  const [showFreeOnly, setShowFreeOnly] = useState(false);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return (assignments || [])
      .filter(a => {
        // Status filter (only keep the requested ones)
        if (filter === 'pending') return a.status === AssignmentStatus.PENDING;
        if (filter === 'graded') return a.status === AssignmentStatus.GRADED;
        if (filter === 'failed') return a.status === AssignmentStatus.FAILED;
        return true; // all
      })
      .filter(a => !showFreeOnly || a.lesson.price === 0 || a.lesson.isFreeForAll || a.lesson.guideIsFreeForAll)
      .filter(a => {
        if (!term) return true;
        const title = a.lesson.title?.toLowerCase() || '';
        const teacher = a.lesson.teacher?.name?.toLowerCase() || '';
        return title.includes(term) || teacher.includes(term);
      })
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
  }, [assignments, filter, search, showFreeOnly]);

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
          <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1">
            {([
              { key: 'all', label: copy?.filters.all || 'ALL' },
              { key: 'pending', label: copy?.filters.pending || 'PENDING' },
              { key: 'graded', label: copy?.filters.graded || 'GRADED' },
              { key: 'failed', label: copy?.filters.failed || 'FAILED' },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={[
                  'px-4 py-2 text-sm font-semibold rounded-lg border transition-all duration-150',
                  filter === key
                    ? (
                        key === 'pending' ? 'border-amber-300/60 bg-amber-400/20 text-amber-100 shadow-[0_10px_25px_rgba(251,191,36,0.15)]' :
                        key === 'graded'  ? 'border-emerald-400/60 bg-emerald-400/15 text-emerald-100 shadow-[0_10px_25px_rgba(52,211,153,0.18)]' :
                        key === 'failed'  ? 'border-rose-400/60 bg-rose-400/15 text-rose-100 shadow-[0_10px_25px_rgba(248,113,113,0.18)]' :
                                            'border-teal-300/60 bg-teal-400/20 text-teal-50 shadow-[0_10px_25px_rgba(45,212,191,0.18)]'
                      )
                    : 'border-slate-800 bg-slate-800/70 text-slate-300 hover:border-teal-500/50 hover:text-white'
                ].join(' ')}
                type="button"
              >
                {label}
              </button>
            ))}
            <label className="ml-1 inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm font-semibold text-slate-200 shadow-sm">
              <Switch
                checked={showFreeOnly}
                onCheckedChange={setShowFreeOnly}
                className="data-[state=checked]:bg-teal-400 data-[state=unchecked]:bg-slate-700 h-5 w-10"
                aria-label={copy?.freeToggle || 'Free lessons only'}
              />
              <span className="text-slate-200">
                {copy?.freeToggle || 'Free lessons only'}
              </span>
            </label>
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
