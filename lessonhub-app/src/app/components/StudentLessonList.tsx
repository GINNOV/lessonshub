'use client';

import React, { useMemo, useState } from 'react';
import { AssignmentStatus, LessonType } from '@prisma/client';
import StudentLessonCard from '@/app/components/StudentLessonCard';
import WeekDivider from '@/app/components/WeekDivider';
import { getWeekAndDay } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Search } from 'lucide-react';

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
  score: number | null;
  pointsAwarded: number;
  answers: any;
  lesson: SerializableLesson;
};

interface StudentLessonListProps {
  assignments: SerializableAssignment[];
}

export default function StudentLessonList({ assignments }: StudentLessonListProps) {
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
      .filter(a => !showFreeOnly || a.lesson.price === 0)
      .filter(a => {
        if (!term) return true;
        const title = a.lesson.title?.toLowerCase() || '';
        const teacher = a.lesson.teacher?.name?.toLowerCase() || '';
        return title.includes(term) || teacher.includes(term);
      })
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
  }, [assignments, filter, search, showFreeOnly]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative w-full md:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <Input
            type="search"
            placeholder="Search by title or teacher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9"
          />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            {([
              { key: 'all', label: 'ALL' },
              { key: 'pending', label: 'PENDING' },
              { key: 'graded', label: 'GRADED' },
              { key: 'failed', label: 'FAILED' },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={[
                  'px-3 py-1.5 rounded-md text-sm font-medium border transition-colors',
                  filter === key
                    ? (
                        key === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                        key === 'graded'  ? 'bg-green-100 text-green-800 border-green-300'   :
                        key === 'failed'  ? 'bg-red-100 text-red-800 border-red-300'         :
                                            'bg-gray-200 text-gray-900 border-gray-300'
                      )
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-300'
                ].join(' ')}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Switch
              id="free-lessons-toggle"
              checked={showFreeOnly}
              onCheckedChange={setShowFreeOnly}
              aria-label="Toggle free lessons filter"
            />
            <Label htmlFor="free-lessons-toggle" className="cursor-pointer">
              Show only free lessons
            </Label>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-gray-500 p-6 border rounded-lg">
          You have no assignments yet. Talk to your teacher if you were expecting some.
        </p>
      ) : (
        <div className="space-y-6">
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
              <div key={week}>
                <WeekDivider weekNumber={week} />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
