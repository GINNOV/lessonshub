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
  <div className="flex items-center gap-4">
    <div className={`rounded-full p-3 ${colorClassName}`}>
      <Icon className="h-6 w-6 text-white" />
    </div>
    <div>
      <p className="text-3xl font-bold text-gray-800">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  </div>
);

export default function TeacherStatsHeader({ stats }: TeacherStatsHeaderProps) {
  const weekdays = getWeekdays();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const selectedDay = searchParams?.get('day');

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
    <Card className="mb-8 shadow-md">
      <CardHeader>
        <CardTitle>Teacher Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
            colorClassName="bg-yellow-500"
          />
          <StatCard
            icon={BookOpen}
            value={stats.totalLessons}
            label="Total Lessons Delivered"
            colorClassName="bg-green-500"
          />
          <div>
            <h4 className="font-semibold text-gray-700 mb-2">This Week&apos;s Schedule</h4>
            <div className="flex items-center gap-2">
              {weekdays.map((day, index) => (
                <button
                  key={day}
                  onClick={() => handleDayClick(index)}
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full font-bold transition-all',
                    stats.lessonsThisWeek.includes(index)
                      ? 'bg-green-500 text-white'
                      : 'bg-red-100 text-red-500',
                    selectedDay === String(index) && 'ring-2 ring-offset-2 ring-blue-500'
                  )}
                  title={
                    stats.lessonsThisWeek.includes(index)
                      ? `Lessons scheduled for ${day}. Click to filter.`
                      : `No lessons for ${day}`
                  }
                >
                  {day.charAt(0)}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
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
            colorClassName="bg-slate-500"
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
