// file: src/app/components/TeacherStatsHeader.tsx
'use client';

import { useState, useTransition } from 'react';
import { BookUser, Coffee, BookOpen, AlertTriangle, CheckCircle2, FolderOpen, BookMarked, Loader2, CalendarDays } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getWeekdays } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ScheduleMapCalendar from '@/app/components/ScheduleMapCalendar';

interface TeacherStatsHeaderProps {
  stats: {
    totalStudents: number;
    studentsOnBreak: number;
    totalLessons: number;
    lessonsThisWeek: number[];
    pastDueLessons: number;
    completedLessons: number;
    emptyLessons: number;
    visibleGuides: number;
  };
  calendarAssignments: Array<{
    deadline: Date | string;
    startDate?: Date | string | null;
    assignedAt?: Date | string | null;
  }>;
}

const StatCard = ({
  icon: Icon,
  value,
  label,
  colorClassName,
  onClick,
  isActive = false,
  isLoading = false,
}: {
  icon: React.ElementType;
  value: number;
  label: string;
  colorClassName: string;
  onClick?: () => void;
  isActive?: boolean;
  isLoading?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'flex items-center gap-4 rounded-2xl border border-slate-800/70 bg-slate-900/70 px-4 py-3 text-left shadow-lg transition hover:border-slate-700/80 hover:bg-slate-900/80',
      isActive && 'ring-2 ring-indigo-300/70 ring-offset-2 ring-offset-slate-950',
      onClick ? 'cursor-pointer' : 'cursor-default'
    )}
  >
    <div className={`flex h-14 w-14 items-center justify-center rounded-full text-white shadow-inner ${colorClassName}`}>
      <Icon className="h-6 w-6" />
    </div>
    <div>
      <p className="flex items-center gap-2 text-3xl font-black leading-tight text-slate-100">
        {value}
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-slate-300" />}
      </p>
      <p className="text-sm font-semibold text-slate-300">{label}</p>
    </div>
  </button>
);

const ScheduleCard = ({
  weekdays,
  lessonsThisWeek,
  selectedDay,
  onDayClick,
  onCalendarClick,
}: {
  weekdays: string[];
  lessonsThisWeek: number[];
  selectedDay: string | null;
  onDayClick: (dayIndex: number) => void;
  onCalendarClick: () => void;
}) => (
  <div className="flex flex-col gap-3 rounded-2xl border border-slate-800/70 bg-slate-900/70 px-4 py-3 shadow-lg">
    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-300">This Week&apos;s Schedule</p>
    <div className="flex flex-wrap items-center gap-2">
      {weekdays.map((day, index) => (
        <button
          key={day}
          onClick={() => onDayClick(index)}
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full font-bold transition-all',
            lessonsThisWeek.includes(index)
              ? 'bg-emerald-500 text-emerald-50 shadow-[0_10px_30px_rgba(52,211,153,0.25)]'
              : 'bg-slate-800 text-slate-300',
            selectedDay === String(index) && 'ring-2 ring-offset-2 ring-teal-400 ring-offset-slate-950'
          )}
          title={
            lessonsThisWeek.includes(index)
              ? `Lessons scheduled for ${day}. Click to filter.`
              : `No lessons for ${day}`
          }
          type="button"
        >
          {day.charAt(0)}
        </button>
      ))}
      <button
        type="button"
        onClick={onCalendarClick}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-slate-300 transition-all hover:bg-slate-700 hover:text-slate-100"
        title="Open schedule map"
      >
        <CalendarDays className="h-4 w-4" />
      </button>
    </div>
  </div>
);

export default function TeacherStatsHeader({ stats, calendarAssignments }: TeacherStatsHeaderProps) {
  const weekdays = getWeekdays();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const selectedDay = searchParams?.get('day') ?? null;
  const activeQuickFilter = searchParams?.get('quickFilter') ?? null;
  const [pendingFilter, setPendingFilter] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const handleDayClick = (dayIndex: number) => {
    const current = new URLSearchParams(searchParams ?? undefined);
    const day = current.get('day');

    if (day === String(dayIndex)) {
      current.delete('day');
    } else {
      current.set('day', String(dayIndex));
    }

    const search = current.toString();
    const query = search ? `?${search}` : '';
    router.push(`${pathname}${query}`);
  };

  const handleQuickFilter = (filter: string) => {
    const current = new URLSearchParams(searchParams ?? undefined);
    current.set('quickFilter', filter);
    const search = current.toString();
    const query = search ? `?${search}` : '';
    router.push(`${pathname}${query}`);
  };

  const triggerQuickFilter = (filter: string) => {
    setPendingFilter(filter);
    startTransition(() => handleQuickFilter(filter));
  };

  return (
    <Card className="mb-6 border border-slate-800/70 bg-slate-950/70 shadow-2xl backdrop-blur-sm">
      <CardContent className="space-y-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={BookUser}
            value={stats.totalStudents}
            label="Enrolled Students"
            colorClassName="bg-blue-500"
          />
          <StatCard
            icon={Coffee}
            value={stats.studentsOnBreak}
            label="Students on Break"
            colorClassName="bg-amber-400"
          />
          <StatCard
            icon={BookOpen}
            value={stats.totalLessons}
            label="Total Lessons Delivered"
            colorClassName="bg-emerald-500"
            onClick={() => triggerQuickFilter('all')}
            isActive={activeQuickFilter === 'all'}
            isLoading={isPending && pendingFilter === 'all'}
          />
          <ScheduleCard
            weekdays={weekdays}
            lessonsThisWeek={stats.lessonsThisWeek}
            selectedDay={selectedDay}
            onDayClick={handleDayClick}
            onCalendarClick={() => setIsCalendarOpen(true)}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <StatCard
            icon={AlertTriangle}
            value={stats.pastDueLessons}
            label="Lessons Past Due"
            colorClassName="bg-red-500"
            onClick={() => triggerQuickFilter('past_due')}
            isActive={activeQuickFilter === 'past_due'}
            isLoading={isPending && pendingFilter === 'past_due'}
          />
          <StatCard
            icon={CheckCircle2}
            value={stats.completedLessons}
            label="Lessons Completed"
            colorClassName="bg-indigo-500"
            onClick={() => triggerQuickFilter('completed')}
            isActive={activeQuickFilter === 'completed'}
            isLoading={isPending && pendingFilter === 'completed'}
          />
          <StatCard
            icon={FolderOpen}
            value={stats.emptyLessons}
            label="Empty Lessons"
            colorClassName="bg-slate-600"
            onClick={() => triggerQuickFilter('empty')}
            isActive={activeQuickFilter === 'empty'}
            isLoading={isPending && pendingFilter === 'empty'}
          />
          <StatCard
            icon={BookMarked}
            value={stats.visibleGuides}
            label="Guides Available"
            colorClassName="bg-purple-500"
            onClick={() => triggerQuickFilter('guides')}
            isActive={activeQuickFilter === 'guides'}
            isLoading={isPending && pendingFilter === 'guides'}
          />
        </div>
      </CardContent>
      <Dialog open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>Schedule Map</DialogTitle>
          </DialogHeader>
          <ScheduleMapCalendar assignments={calendarAssignments} />
        </DialogContent>
      </Dialog>
    </Card>
  );
}
