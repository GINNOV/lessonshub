// file: src/app/components/ScheduleMapCalendar.tsx
'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type CalendarAssignment = {
  deadline: Date | string;
  startDate?: Date | string | null;
  assignedAt?: Date | string | null;
};

const QUICK_FILTER_RANGE_START = '2000-01-01';

const getDefaultStartDate = (assignments: CalendarAssignment[]) => {
  const dates = assignments
    .map((assignment) => assignment.startDate ?? assignment.assignedAt ?? assignment.deadline)
    .filter(Boolean)
    .map((date) => new Date(date as Date | string))
    .filter((date) => !Number.isNaN(date.getTime()));
  if (dates.length === 0) return new Date();
  const earliest = dates.reduce((min, current) => (current < min ? current : min));
  return earliest;
};

export default function ScheduleMapCalendar({
  assignments,
}: {
  assignments: CalendarAssignment[];
}) {
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const startDate = new Date();
    return new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  });

  const availabilityByDueDate = useMemo(() => {
    const map = new Map<string, { startDayCounts: Map<number, number> }>();
    assignments.forEach((assignment) => {
      const availableDate = assignment.startDate ?? assignment.assignedAt;
      if (!availableDate) return;
      const dueKey = new Date(assignment.deadline).toLocaleDateString('en-CA');
      const entry = map.get(dueKey) ?? { startDayCounts: new Map<number, number>() };
      const startDay = new Date(availableDate).getDate();
      entry.startDayCounts.set(startDay, (entry.startDayCounts.get(startDay) ?? 0) + 1);
      map.set(dueKey, entry);
    });
    return map;
  }, [assignments]);

  const calendarDays = useMemo(() => {
    const firstOfMonth = new Date(calendarMonth);
    const year = firstOfMonth.getFullYear();
    const month = firstOfMonth.getMonth();
    const firstDayIndex = firstOfMonth.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: {
      date: Date;
      inMonth: boolean;
      key: string;
      startDay: number | null;
      dueDay: number | null;
    }[] = [];

    const prevMonthDays = firstDayIndex;
    const totalCells = Math.ceil((prevMonthDays + daysInMonth) / 7) * 7;

    for (let i = 0; i < totalCells; i++) {
      const dayOffset = i - prevMonthDays + 1;
      const current = new Date(year, month, dayOffset);
      const key = current.toLocaleDateString('en-CA');
      const inMonth = current.getMonth() === month;
      const availability = availabilityByDueDate.get(key);
      let startDay: number | null = null;
      if (availability?.startDayCounts?.size) {
        let bestDay = -1;
        let bestCount = -1;
        availability.startDayCounts.forEach((count, day) => {
          if (count > bestCount || (count === bestCount && day < bestDay)) {
            bestDay = day;
            bestCount = count;
          }
        });
        startDay = bestDay > 0 ? bestDay : null;
      }
      let dueDay: number | null = null;
      if (availability) {
        dueDay = current.getDate();
      }
      days.push({
        date: current,
        inMonth,
        key,
        startDay,
        dueDay,
      });
    }
    return days;
  }, [availabilityByDueDate, calendarMonth]);

  const goToMonth = (delta: number) => {
    setCalendarMonth((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + delta);
      return next;
    });
  };

  const monthLabel = calendarMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Schedule map</p>
          <h3 className="text-lg font-semibold">Allocated deadlines</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" size="icon" variant="outline" onClick={() => goToMonth(-1)} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[140px] text-center text-sm font-medium">
            {monthLabel}
          </div>
          <Button type="button" size="icon" variant="outline" onClick={() => goToMonth(1)} aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-foreground">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1 text-sm">
        {calendarDays.map(({ date, inMonth, key, startDay, dueDay }) => (
          <div
            key={`${key}-${date.getDate()}`}
            className={cn(
              'overflow-hidden rounded-md border text-center text-[11px] font-semibold',
              inMonth ? 'border-border' : 'border-border/70 opacity-70'
            )}
          >
            <div
              className={cn(
                'px-2 py-1 text-xs',
                inMonth ? 'bg-card text-foreground' : 'bg-muted/50 text-muted-foreground'
              )}
            >
              {date.getDate()}
            </div>
            <div className="grid grid-cols-2 border-t border-border/80 text-sm">
              <div
                className={cn(
                  'flex items-center justify-center px-2 py-2',
                  startDay ? 'bg-emerald-100 text-emerald-800' : 'bg-transparent text-transparent'
                )}
              >
                {startDay ?? ''}
              </div>
              <div
                className={cn(
                  'flex items-center justify-center border-l border-border/80 px-2 py-2',
                  dueDay ? 'bg-rose-100 text-rose-800' : 'bg-transparent text-transparent'
                )}
              >
                {dueDay ?? ''}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
