'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Assignment, Lesson, User } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Check, ChevronLeft, ChevronRight, RotateCw, Search } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  convertDateTimeInputBetweenTimeZones,
  DEFAULT_SCHEDULING_TIME_ZONE,
  formatDateTimeForInput,
  formatDateTimeForScheduleDisplay,
  getDateKeyInTimeZone,
  getDayOfMonthInTimeZone,
  getSchedulingTimeZoneOptions,
  parseDateTimeInputInTimeZone,
  shiftDateKey,
} from '@/lib/schedulingTimeZone';

export type StudentWithStats = Omit<User, 'defaultLessonPrice'> & {
  totalPoints: number;
  defaultLessonPrice: number | null;
  currentClassId?: string | null;
  currentClassName?: string | null;
};

interface AssignLessonFormProps {
  lesson: Omit<Lesson, 'price'> & { price: number };
  students: StudentWithStats[];
  existingAssignments: Assignment[];
  calendarAssignments?: Pick<Assignment, 'deadline' | 'lessonId' | 'startDate' | 'assignedAt'>[];
  classes?: { id: string; name: string; isActive: boolean }[];
}

const getDefaultMidnightDate = (timeZone: string) => {
  const todayKey = getDateKeyInTimeZone(new Date(), timeZone);
  if (!todayKey) return '';
  return `${shiftDateKey(todayKey, 1)}T23:59`;
};

const getDefaultStartDate = (
  assignments: Array<{ startDate?: Date | string | null; assignedAt?: Date | string | null }>,
  timeZone: string,
) => {
  const availabilityCounts = new Map<string, number>();
  assignments.forEach((assignment) => {
    const availableDate = assignment.startDate ?? assignment.assignedAt;
    if (!availableDate) return;
    const key = getDateKeyInTimeZone(availableDate, timeZone);
    if (!key) return;
    availabilityCounts.set(key, (availabilityCounts.get(key) ?? 0) + 1);
  });

  const now = new Date();
  const nowKey = getDateKeyInTimeZone(now, timeZone);
  const nowLocal = formatDateTimeForInput(now, timeZone).slice(11, 16);
  let candidateKey = nowKey ? (nowLocal >= '06:00' ? shiftDateKey(nowKey, 1) : nowKey) : null;
  if (!candidateKey) return '';

  const maxDaysToCheck = 365;
  for (let i = 0; i < maxDaysToCheck; i += 1) {
    if (!availabilityCounts.has(candidateKey)) {
      return `${candidateKey}T06:00`;
    }
    candidateKey = shiftDateKey(candidateKey, 1);
  }

  return `${candidateKey}T06:00`;
};

export default function AssignLessonForm({
  lesson,
  students,
  existingAssignments = [],
  calendarAssignments = [],
  classes = [],
}: AssignLessonFormProps) {
  const router = useRouter();
  const [scheduleTimeZone, setScheduleTimeZone] = useState(DEFAULT_SCHEDULING_TIME_ZONE);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [deadlines, setDeadlines] = useState<Record<string, string>>({});
  const [startDates, setStartDates] = useState<Record<string, string>>({});
  const [notificationOption, setNotificationOption] = useState('on_start_date');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [classFilter, setClassFilter] = useState<string>('all'); // 'all' | 'none' | classId
  const [reassigningStudents, setReassigningStudents] = useState<string[]>([]);
  const [showDateWarning, setShowDateWarning] = useState(false);
  const [dateWarnings, setDateWarnings] = useState<Array<{ studentName: string; startDate: string; deadline: string }>>([]);
  const [pendingAssignments, setPendingAssignments] = useState<Array<{ studentId: string; deadline: string; startDate: string }> | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const previousTimeZoneRef = useRef(scheduleTimeZone);
  const scheduleTimeZoneRef = useRef(scheduleTimeZone);
  const timeZoneOptions = useMemo(() => getSchedulingTimeZoneOptions(), []);

  const defaultStartDate = useMemo(
    () => getDefaultStartDate(calendarAssignments, scheduleTimeZone),
    [calendarAssignments, scheduleTimeZone],
  );

  // Initialize with default values first
  const [masterDeadline, setMasterDeadline] = useState<string>(getDefaultMidnightDate(DEFAULT_SCHEDULING_TIME_ZONE));
  const [masterStartDate, setMasterStartDate] = useState<string>(defaultStartDate);
  
  const existingAssignmentsMap = useMemo(() => 
    new Map(existingAssignments.map(a => [a.studentId, a])), 
  [existingAssignments]);
  const reassigningSet = useMemo(
    () => new Set(reassigningStudents),
    [reassigningStudents],
  );

  useEffect(() => {
    scheduleTimeZoneRef.current = scheduleTimeZone;
  }, [scheduleTimeZone]);

  useEffect(() => {
    // This effect runs once when the component mounts and props are available
    if (existingAssignments && (existingAssignments?.length ?? 0) > 0) {
      const activeTimeZone = scheduleTimeZoneRef.current;
      const initialDeadlines: Record<string, string> = {};
      const initialStartDates: Record<string, string> = {};
      const initialSelected: string[] = [];
      existingAssignments.forEach(a => {
        initialDeadlines[a.studentId] = formatDateTimeForInput(a.deadline, activeTimeZone);
        initialStartDates[a.studentId] = formatDateTimeForInput(a.startDate, activeTimeZone);
        initialSelected.push(a.studentId);
      });
      setDeadlines(initialDeadlines);
      setStartDates(initialStartDates);
      setSelectedStudents(initialSelected);
      
      const firstAssignment = existingAssignments[0];
      if (firstAssignment) {
        // Correctly set the master dates from the loaded data
        setMasterStartDate(formatDateTimeForInput(firstAssignment.startDate, activeTimeZone));
        setMasterDeadline(formatDateTimeForInput(firstAssignment.deadline, activeTimeZone));
      }
    }
  }, [existingAssignments]);

  useEffect(() => {
    const previousTimeZone = previousTimeZoneRef.current;
    if (previousTimeZone === scheduleTimeZone) return;

    const convertMap = (values: Record<string, string>) => {
      const nextEntries = Object.entries(values).map(([key, value]) => [
        key,
        value
          ? convertDateTimeInputBetweenTimeZones(
              value,
              previousTimeZone,
              scheduleTimeZone,
            )
          : value,
      ]);
      return Object.fromEntries(nextEntries);
    };

    setMasterStartDate((prev) =>
      prev
        ? convertDateTimeInputBetweenTimeZones(
            prev,
            previousTimeZone,
            scheduleTimeZone,
          )
        : prev,
    );
    setMasterDeadline((prev) =>
      prev
        ? convertDateTimeInputBetweenTimeZones(
            prev,
            previousTimeZone,
            scheduleTimeZone,
          )
        : prev,
    );
    setStartDates((prev) => convertMap(prev));
    setDeadlines((prev) => convertMap(prev));
    previousTimeZoneRef.current = scheduleTimeZone;
  }, [scheduleTimeZone]);

  useEffect(() => {
    if (notificationOption !== 'none') return;

    const now = formatDateTimeForInput(new Date(), scheduleTimeZone);

    setMasterStartDate((prev) => (prev === now ? prev : now));

    setStartDates((prev) => {
      let hasChanges = false;
      const updated: Record<string, string> = { ...prev };

      selectedStudents.forEach((id) => {
        if (updated[id] !== now) {
          updated[id] = now;
          hasChanges = true;
        }
      });

      return hasChanges ? updated : prev;
    });
  }, [notificationOption, scheduleTimeZone, selectedStudents]);

  const assignmentsForCalendar = calendarAssignments.length > 0 ? calendarAssignments : existingAssignments;

  const availabilityByDueDate = useMemo(() => {
    const map = new Map<string, { startDayCounts: Map<number, number> }>();
    assignmentsForCalendar.forEach((assignment) => {
      const availableDate = assignment.startDate ?? assignment.assignedAt;
      if (!availableDate) return;
      const dueKey = getDateKeyInTimeZone(assignment.deadline, scheduleTimeZone);
      if (!dueKey) return;
      const entry = map.get(dueKey) ?? { startDayCounts: new Map<number, number>() };
      const startDay = getDayOfMonthInTimeZone(availableDate, scheduleTimeZone);
      if (!startDay) return;
      entry.startDayCounts.set(startDay, (entry.startDayCounts.get(startDay) ?? 0) + 1);
      map.set(dueKey, entry);
    });
    return map;
  }, [assignmentsForCalendar, scheduleTimeZone]);

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


  const filteredStudents = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return students
      .filter((student) =>
        (student.name?.toLowerCase().includes(term) || student.email.toLowerCase().includes(term))
      )
      .filter((student) => {
        if (classFilter === 'all') return true;
        if (classFilter === 'none') return !student.currentClassId;
        return student.currentClassId === classFilter;
      });
  }, [students, searchTerm, classFilter]);

  const handleSelectStudent = (studentId: string, isSelected: boolean) => {
    setSelectedStudents((prev) => {
      const newSelected = isSelected ? [...prev, studentId] : prev.filter((id) => id !== studentId);
      if (isSelected) {
        if (masterDeadline && !deadlines[studentId]) {
            setDeadlines(prevDeadlines => ({ ...prevDeadlines, [studentId]: masterDeadline }));
        }
        if (masterStartDate && !startDates[studentId]) {
            setStartDates(prevStartDates => ({ ...prevStartDates, [studentId]: masterStartDate }));
        }
      }
      return newSelected;
    });
  };

  const handleSelectAll = (isSelected: boolean) => {
    const allFilteredIds = filteredStudents.map(s => s.id);
    setSelectedStudents(isSelected ? allFilteredIds : []);
    if (isSelected) {
        const newDeadlines = { ...deadlines };
        const newStartDates = { ...startDates };
        allFilteredIds.forEach(id => {
            if (masterDeadline && !newDeadlines[id]) newDeadlines[id] = masterDeadline;
            if (masterStartDate && !newStartDates[id]) newStartDates[id] = masterStartDate;
        });
        setDeadlines(newDeadlines);
        setStartDates(newStartDates);
    }
  };

  const handleQueueReassign = (studentId: string) => {
    setSelectedStudents((prev) => (prev.includes(studentId) ? prev : [...prev, studentId]));
    if (masterDeadline) {
      setDeadlines((prev) => ({ ...prev, [studentId]: masterDeadline }));
    }
    if (masterStartDate) {
      setStartDates((prev) => ({ ...prev, [studentId]: masterStartDate }));
    }
    setReassigningStudents((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId],
    );
  };
  
  const handleMasterDeadlineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDeadline = e.target.value;
    setMasterDeadline(newDeadline);
    const newDeadlines = { ...deadlines };
    selectedStudents.forEach(studentId => {
        newDeadlines[studentId] = newDeadline;
    });
    setDeadlines(newDeadlines);
  };

  const handleMasterStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartDate = e.target.value;
    setMasterStartDate(newStartDate);
    const newStartDates = { ...startDates };
    selectedStudents.forEach(studentId => {
        newStartDates[studentId] = newStartDate;
    });
    setStartDates(newStartDates);
  };

  const submitAssignments = async (assignmentsToProcess: Array<{ studentId: string; deadline: string; startDate: string }>) => {
    setIsLoading(true);
    setIsSaved(false);

    const initialAssignedStudents = new Set(existingAssignments.map(a => a.studentId));
    const reassignStudentIds = new Set(
      reassigningStudents.filter((id) => initialAssignedStudents.has(id)),
    );

    const studentIdsToUnassign = Array.from(initialAssignedStudents).filter(
      (id) => !selectedStudents.includes(id),
    );

    const assignmentsToUpdate = assignmentsToProcess.filter(
      (a) => initialAssignedStudents.has(a.studentId) && !reassignStudentIds.has(a.studentId),
    );
    const assignmentsToCreate = assignmentsToProcess.filter(
      (a) => !initialAssignedStudents.has(a.studentId),
    );
    const assignmentsToReassign = assignmentsToProcess.filter((a) =>
      reassignStudentIds.has(a.studentId),
    );

    try {
      const response = await fetch('/api/assignments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId: lesson.id,
          studentIdsToAssign: assignmentsToCreate,
          studentIdsToUpdate: assignmentsToUpdate,
          studentIdsToReassign: assignmentsToReassign,
          studentIdsToUnassign,
          notificationOption,
        }),
      });

      if (!response.ok) throw new Error((await response.json()).error || 'Failed to update assignments.');

      const messages = [];
      if (assignmentsToCreate.length > 0) messages.push(`${assignmentsToCreate.length} assigned`);
      if (assignmentsToUpdate.length > 0) messages.push(`${assignmentsToUpdate.length} updated`);
      if (assignmentsToReassign.length > 0) messages.push(`${assignmentsToReassign.length} reassigned`);
      if (studentIdsToUnassign.length > 0) messages.push(`${studentIdsToUnassign.length} unassigned`);

      toast.success(messages.length > 0 ? `Assignments updated: ${messages.join(', ')}.` : 'No changes were made.');
      setIsSaved(true);
      setLastSavedAt(new Date());
      setReassigningStudents([]);
      setTimeout(() => setIsSaved(false), 2000);

      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsLoading(false);
      setPendingAssignments(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const assignmentsWithParsedDates = selectedStudents.map((id) => ({
      studentId: id,
      deadlineISO: parseDateTimeInputInTimeZone(deadlines[id], scheduleTimeZone)?.toISOString() ?? null,
      startDateISO: parseDateTimeInputInTimeZone(startDates[id], scheduleTimeZone)?.toISOString() ?? null,
    }));

    const studentsWithoutDates = assignmentsWithParsedDates
      .filter(({ deadlineISO, startDateISO }) => !deadlineISO || !startDateISO)
      .map(({ studentId }) => studentId);

    if (studentsWithoutDates.length > 0) {
      const studentNames = studentsWithoutDates.map(id => students.find(s => s.id === id)?.name || 'a student').join(', ');
      toast.error(`Please provide a start date and deadline for: ${studentNames}`);
      return;
    }

    const assignmentsToProcess = assignmentsWithParsedDates.map(({ studentId, deadlineISO, startDateISO }) => ({
      studentId,
      deadline: deadlineISO as string,
      startDate: startDateISO as string,
    }));

    const warnings = assignmentsToProcess
      .filter((assignment) => new Date(assignment.deadline).getTime() < new Date(assignment.startDate).getTime())
      .map((assignment) => ({
        studentName: students.find(s => s.id === assignment.studentId)?.name || 'Student',
        startDate: assignment.startDate,
        deadline: assignment.deadline,
      }));

    if (warnings.length > 0) {
      setDateWarnings(warnings);
      setPendingAssignments(assignmentsToProcess);
      setShowDateWarning(true);
      return;
    }

    await submitAssignments(assignmentsToProcess);
  };
  
  const areAllFilteredSelected = filteredStudents.length > 0 && selectedStudents.length >= filteredStudents.length && filteredStudents.every(s => selectedStudents.includes(s.id));

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-2">
            <Label htmlFor="schedule-time-zone">Schedule Timezone</Label>
            <select
              id="schedule-time-zone"
              className="w-full rounded-md border border-gray-300 p-2 shadow-sm"
              value={scheduleTimeZone}
              onChange={(e) => setScheduleTimeZone(e.target.value)}
            >
              {timeZoneOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Start and due times in this form use the selected timezone. Default is Central Time.
            </p>
        </div>
        <div className="space-y-2">
            <Label htmlFor="start-date">Set Start Date</Label>
            <Input id="start-date" type="datetime-local" value={masterStartDate} onChange={handleMasterStartDateChange} disabled={notificationOption === 'none'} className="w-full" />
        </div>
        <div className="space-y-2">
            <Label htmlFor="deadline">Set Due Date</Label>
            <Input id="deadline" type="datetime-local" value={masterDeadline} onChange={handleMasterDeadlineChange} className="w-full" />
        </div>
      </div>

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
              {calendarMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
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

      <div className="p-4 border rounded-md space-y-3">
        <Label className="mb-2 block font-semibold">Notification Options</Label>
        <RadioGroup value={notificationOption} onValueChange={setNotificationOption} className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="on_start_date" id="on_start_date" />
            <Label htmlFor="on_start_date">Notify students on assign day</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="immediate" id="immediate" />
            <Label htmlFor="immediate">Notify students now</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="none" id="none" />
            <Label htmlFor="none">Don&apos;t notify</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
            <Label htmlFor="search">Search Students</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
              <Input id="search" type="search" placeholder="Filter by name or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
            </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="class-filter">Filter by Class</Label>
          <select
            id="class-filter"
            className="w-full rounded-md border border-gray-300 p-2 shadow-sm"
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
          >
            <option value="all">All students</option>
            <option value="none">No class</option>
            {classes.filter(c => c.isActive).map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-md border bg-muted/50 px-3 py-2 text-sm">
        <div>
          <span className="font-semibold">{selectedStudents.length}</span> selected of{' '}
          <span className="font-semibold">{filteredStudents.length}</span> shown
        </div>
        <label htmlFor="select-all-filtered" className="flex items-center gap-2 font-medium text-muted-foreground">
          <Checkbox
            id="select-all-filtered"
            checked={areAllFilteredSelected}
            onCheckedChange={(checked) => handleSelectAll(!!checked)}
          />
          <span>Select all filtered</span>
        </label>
      </div>

      <div className="hidden md:block rounded-lg border overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left">
                <span className="sr-only">Select student</span>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Class</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Start Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Due Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Reassign</th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {filteredStudents.map((student) => (
              <tr key={student.id}>
                <td className="px-4 py-4">
                  <Checkbox
                    id={`desktop-${student.id}`}
                    checked={selectedStudents.includes(student.id)}
                    onCheckedChange={(checked) => handleSelectStudent(student.id, !!checked)}
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">{student.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                  {student.currentClassName ?? (student.currentClassId ? 'Unknown class' : 'No class')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Input
                    type="datetime-local"
                    value={startDates[student.id] || ''}
                    onChange={(e) => setStartDates((prev) => ({ ...prev, [student.id]: e.target.value }))}
                    className="text-sm"
                    disabled={notificationOption === 'none'}
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Input
                    type="datetime-local"
                    value={deadlines[student.id] || ''}
                    onChange={(e) => setDeadlines((prev) => ({ ...prev, [student.id]: e.target.value }))}
                    className="text-sm"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Button
                    type="button"
                    size="sm"
                    variant={reassigningSet.has(student.id) ? 'default' : 'outline'}
                    onClick={() => handleQueueReassign(student.id)}
                    disabled={!existingAssignmentsMap.has(student.id)}
                    className={cn(
                      'min-w-[110px]',
                      reassigningSet.has(student.id) && 'bg-emerald-500 text-slate-950 hover:brightness-110',
                    )}
                  >
                    <RotateCw className="mr-2 h-4 w-4" />
                    {reassigningSet.has(student.id) ? 'Queued' : 'Reassign'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-4">
        {filteredStudents.map((student) => {
          const startId = `mobile-start-${student.id}`;
          const deadlineId = `mobile-deadline-${student.id}`;

          return (
            <div key={student.id} className="rounded-lg border border-border bg-card p-4 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-foreground">{student.name ?? 'Unnamed student'}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Class: {student.currentClassName ?? (student.currentClassId ? 'Unknown class' : 'No class')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`mobile-${student.id}`} className="text-xs font-medium uppercase text-muted-foreground">
                    Assign
                  </Label>
                  <Checkbox
                    id={`mobile-${student.id}`}
                    checked={selectedStudents.includes(student.id)}
                    onCheckedChange={(checked) => handleSelectStudent(student.id, !!checked)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor={startId} className="text-xs uppercase text-muted-foreground">Start Date</Label>
                  <Input
                    id={startId}
                    type="datetime-local"
                    value={startDates[student.id] || ''}
                    onChange={(e) => setStartDates((prev) => ({ ...prev, [student.id]: e.target.value }))}
                    disabled={notificationOption === 'none'}
                    className="w-full"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={deadlineId} className="text-xs uppercase text-muted-foreground">Due Date</Label>
                  <Input
                    id={deadlineId}
                    type="datetime-local"
                    value={deadlines[student.id] || ''}
                    onChange={(e) => setDeadlines((prev) => ({ ...prev, [student.id]: e.target.value }))}
                    className="w-full"
                  />
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant={reassigningSet.has(student.id) ? 'default' : 'outline'}
                onClick={() => handleQueueReassign(student.id)}
                disabled={!existingAssignmentsMap.has(student.id)}
                className={cn(
                  'w-full',
                  reassigningSet.has(student.id) && 'bg-emerald-500 text-slate-950 hover:brightness-110',
                )}
              >
                <RotateCw className="mr-2 h-4 w-4" />
                {reassigningSet.has(student.id) ? 'Queued for reassign' : 'Reassign'}
              </Button>
            </div>
          );
        })}

        {filteredStudents.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">No students match the current filters.</p>
        )}
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-4">
        <Button type="submit" disabled={isLoading} className="w-full sm:flex-1">
          {isLoading ? 'Saving...' : (isSaved ? <Check className="h-4 w-4 text-white" /> : 'Save Assignments')}
        </Button>
        {lastSavedAt && (
          <p className="text-sm text-muted-foreground sm:text-right">
            Last saved: {lastSavedAt.toLocaleTimeString()}
          </p>
        )}
      </div>
      </form>

      <Dialog open={showDateWarning} onOpenChange={setShowDateWarning}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Due date is before the start date</DialogTitle>
            <DialogDescription>
              Some students have a deadline that is earlier than the start date. This can block them from opening the lesson.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            {dateWarnings.slice(0, 5).map((warning) => (
              <div key={`${warning.studentName}-${warning.deadline}`} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{warning.studentName}</p>
                  <p className="text-xs">
                    Start: {formatDateTimeForScheduleDisplay(warning.startDate, scheduleTimeZone)} · Due: {formatDateTimeForScheduleDisplay(warning.deadline, scheduleTimeZone)}
                  </p>
                </div>
              </div>
            ))}
            {dateWarnings.length > 5 && (
              <p className="text-xs">+ {dateWarnings.length - 5} more students</p>
            )}
          </div>
          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowDateWarning(false);
                setPendingAssignments(null);
              }}
            >
              Go back
            </Button>
            <Button
              type="button"
              onClick={() => {
                const payload = pendingAssignments;
                setShowDateWarning(false);
                if (payload) {
                  submitAssignments(payload);
                }
              }}
            >
              Save anyway
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
