// file: src/app/components/TeacherStatsHeader.tsx
'use client';

import { BookUser, Coffee, BookOpen, AlertTriangle, CheckCircle2, FolderOpen, BookMarked } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getWeekdays } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

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
}

const StatCard = ({
  icon: Icon,
  value,
  label,
  colorClassName,
}: {
  icon: React.ElementType;
  value: number;
  label: string;
  colorClassName: string;
}) => (
  <div className="flex items-center gap-4 rounded-2xl border border-slate-800/70 bg-slate-900/70 px-4 py-3 shadow-lg">
    <div className={`flex h-14 w-14 items-center justify-center rounded-full text-white shadow-inner ${colorClassName}`}>
      <Icon className="h-6 w-6" />
    </div>
    <div>
      <p className="text-3xl font-black leading-tight text-slate-100">{value}</p>
      <p className="text-sm font-semibold text-slate-300">{label}</p>
    </div>
  </div>
);

const ScheduleCard = ({
  weekdays,
  lessonsThisWeek,
  selectedDay,
  onDayClick,
}: {
  weekdays: string[];
  lessonsThisWeek: number[];
  selectedDay: string | null;
  onDayClick: (dayIndex: number) => void;
}) => (
  <div className="flex h-full flex-col justify-center gap-3 rounded-2xl border border-slate-800/70 bg-slate-900/70 px-4 py-3 shadow-lg">
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
    </div>
  </div>
);

export default function TeacherStatsHeader({ stats }: TeacherStatsHeaderProps) {
  const weekdays = getWeekdays();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const selectedDay = searchParams?.get('day') ?? null;

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
          />
          <ScheduleCard
            weekdays={weekdays}
            lessonsThisWeek={stats.lessonsThisWeek}
            selectedDay={selectedDay}
            onDayClick={handleDayClick}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <StatCard
            icon={AlertTriangle}
            value={stats.pastDueLessons}
            label="Lessons Past Due"
            colorClassName="bg-red-500"
          />
          <StatCard
            icon={CheckCircle2}
            value={stats.completedLessons}
            label="Lessons Completed"
            colorClassName="bg-indigo-500"
          />
          <StatCard
            icon={FolderOpen}
            value={stats.emptyLessons}
            label="Empty Lessons"
            colorClassName="bg-slate-600"
          />
          <StatCard
            icon={BookMarked}
            value={stats.visibleGuides}
            label="Guides Available"
            colorClassName="bg-purple-500"
          />
        </div>
      </CardContent>
    </Card>
  );
}
