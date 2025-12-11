'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Assignment, Lesson, User } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Check, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

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
  calendarAssignments?: Pick<Assignment, 'deadline' | 'lessonId'>[];
  classes?: { id: string; name: string; isActive: boolean }[];
}

const formatDateTimeForInput = (date: Date | null | undefined): string => {
    if (!date) return '';
    try {
        const d = new Date(date);
        const timezoneOffset = d.getTimezoneOffset() * 60000;
        const localDate = new Date(d.getTime() - timezoneOffset);
        return localDate.toISOString().slice(0, 16);
    } catch (e) {
        return '';
    }
};

const getDefaultMidnightDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 0, 0);
    return formatDateTimeForInput(tomorrow);
}

const getDefaultStartDate = () => {
    const today = new Date();
    today.setHours(9, 0, 0, 0); // Today at 9:00 AM
    return formatDateTimeForInput(today);
}

const toISOStringWithTimezone = (value: string | undefined): string | null => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
};

export default function AssignLessonForm({
  lesson,
  students,
  existingAssignments = [],
  calendarAssignments = [],
  classes = [],
}: AssignLessonFormProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [deadlines, setDeadlines] = useState<Record<string, string>>({});
  const [startDates, setStartDates] = useState<Record<string, string>>({});
  const [notificationOption, setNotificationOption] = useState('on_start_date');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [classFilter, setClassFilter] = useState<string>('all'); // 'all' | 'none' | classId
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // Initialize with default values first
  const [masterDeadline, setMasterDeadline] = useState<string>(getDefaultMidnightDate());
  const [masterStartDate, setMasterStartDate] = useState<string>(getDefaultStartDate());
  
  const existingAssignmentsMap = useMemo(() => 
    new Map(existingAssignments.map(a => [a.studentId, a])), 
  [existingAssignments]);

  useEffect(() => {
    // This effect runs once when the component mounts and props are available
    if (existingAssignments && (existingAssignments?.length ?? 0) > 0) {
      const initialDeadlines: Record<string, string> = {};
      const initialStartDates: Record<string, string> = {};
      const initialSelected: string[] = [];
      existingAssignments.forEach(a => {
        initialDeadlines[a.studentId] = formatDateTimeForInput(a.deadline);
        initialStartDates[a.studentId] = formatDateTimeForInput(a.startDate);
        initialSelected.push(a.studentId);
      });
      setDeadlines(initialDeadlines);
      setStartDates(initialStartDates);
      setSelectedStudents(initialSelected);
      
      const firstAssignment = existingAssignments[0];
      if (firstAssignment) {
        // Correctly set the master dates from the loaded data
        setMasterStartDate(formatDateTimeForInput(firstAssignment.startDate));
        setMasterDeadline(formatDateTimeForInput(firstAssignment.deadline));
      }
    }
  }, [existingAssignments]);

  useEffect(() => {
    if (notificationOption !== 'none') return;

    const now = formatDateTimeForInput(new Date());

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
  }, [notificationOption, selectedStudents]);

  const assignmentsForCalendar = calendarAssignments.length > 0 ? calendarAssignments : existingAssignments;

  const assignmentCountsByDate = useMemo(() => {
    const counts = new Map<string, number>();
    assignmentsForCalendar.forEach((assignment) => {
      const dateKey = new Date(assignment.deadline).toLocaleDateString('en-CA');
      counts.set(dateKey, (counts.get(dateKey) ?? 0) + 1);
    });
    return counts;
  }, [assignmentsForCalendar]);

  const calendarDays = useMemo(() => {
    const firstOfMonth = new Date(calendarMonth);
    const year = firstOfMonth.getFullYear();
    const month = firstOfMonth.getMonth();
    const firstDayIndex = firstOfMonth.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: { date: Date; inMonth: boolean; key: string; count: number }[] = [];

    const prevMonthDays = firstDayIndex;
    const totalCells = Math.ceil((prevMonthDays + daysInMonth) / 7) * 7;

    for (let i = 0; i < totalCells; i++) {
      const dayOffset = i - prevMonthDays + 1;
      const current = new Date(year, month, dayOffset);
      const key = current.toLocaleDateString('en-CA');
      const inMonth = current.getMonth() === month;
      days.push({
        date: current,
        inMonth,
        key,
        count: assignmentCountsByDate.get(key) ?? 0,
      });
    }
    return days;
  }, [assignmentCountsByDate, calendarMonth]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setIsSaved(false);

    const assignmentsWithParsedDates = selectedStudents.map((id) => ({
      studentId: id,
      deadlineISO: toISOStringWithTimezone(deadlines[id]),
      startDateISO: toISOStringWithTimezone(startDates[id]),
    }));

    const studentsWithoutDates = assignmentsWithParsedDates
      .filter(({ deadlineISO, startDateISO }) => !deadlineISO || !startDateISO)
      .map(({ studentId }) => studentId);

    if (studentsWithoutDates.length > 0) {
        const studentNames = studentsWithoutDates.map(id => students.find(s => s.id === id)?.name || 'a student').join(', ');
        toast.error(`Please provide a start date and deadline for: ${studentNames}`);
        setIsLoading(false);
        return;
    }

    const initialAssignedStudents = new Set(existingAssignments.map(a => a.studentId));
    
    const studentIdsToUnassign = Array.from(initialAssignedStudents).filter(id => !selectedStudents.includes(id));
    
    const assignmentsToProcess = assignmentsWithParsedDates.map(({ studentId, deadlineISO, startDateISO }) => ({
        studentId,
        deadline: deadlineISO as string,
        startDate: startDateISO as string,
    }));
    
    const assignmentsToUpdate = assignmentsToProcess.filter(a => initialAssignedStudents.has(a.studentId));
    const assignmentsToCreate = assignmentsToProcess.filter(a => !initialAssignedStudents.has(a.studentId));

    try {
      const response = await fetch('/api/assignments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId: lesson.id,
          studentIdsToAssign: assignmentsToCreate,
          studentIdsToUpdate: assignmentsToUpdate,
          studentIdsToUnassign,
          notificationOption,
        }),
      });

      if (!response.ok) throw new Error((await response.json()).error || 'Failed to update assignments.');
      
      const messages = [];
      if (assignmentsToCreate.length > 0) messages.push(`${assignmentsToCreate.length} assigned`);
      if (assignmentsToUpdate.length > 0) messages.push(`${assignmentsToUpdate.length} updated`);
      if (studentIdsToUnassign.length > 0) messages.push(`${studentIdsToUnassign.length} unassigned`);
      
      toast.success(messages.length > 0 ? `Assignments updated: ${messages.join(', ')}.` : 'No changes were made.');
      setIsSaved(true);
      setLastSavedAt(new Date());
      setTimeout(() => setIsSaved(false), 2000);
      
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const areAllFilteredSelected = filteredStudents.length > 0 && selectedStudents.length >= filteredStudents.length && filteredStudents.every(s => selectedStudents.includes(s.id));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
            <Label htmlFor="start-date">Set Start Date</Label>
            <Input id="start-date" type="datetime-local" value={masterStartDate} onChange={handleMasterStartDateChange} disabled={notificationOption === 'none'} className="w-full" />
        </div>
        <div className="space-y-2">
            <Label htmlFor="deadline">Set Due Date</Label>
            <Input id="deadline" type="datetime-local" value={masterDeadline} onChange={handleMasterDeadlineChange} className="w-full" />
        </div>
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
          {calendarDays.map(({ date, inMonth, key, count }) => (
            <div
              key={`${key}-${date.getDate()}`}
              className={cn(
                'rounded-md px-2 py-3 border text-center',
                inMonth ? 'bg-card' : 'bg-muted/50 text-muted-foreground',
                count > 0 ? 'border-emerald-200 bg-emerald-50/70 text-emerald-800 font-semibold' : 'border-border text-foreground'
              )}
            >
              <div className="text-xs">{date.getDate()}</div>
              {count > 0 && <div className="text-[11px]">{count} due</div>}
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 border rounded-md space-y-3">
        <Label className="mb-2 block font-semibold">Notification Options</Label>
        <RadioGroup value={notificationOption} onValueChange={setNotificationOption} className="space-y-2">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="on_start_date" id="on_start_date" />
            <Label htmlFor="on_start_date">Notify students on the start date (default)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="immediate" id="immediate" />
            <Label htmlFor="immediate">Notify newly assigned students immediately</Label>
          </div>
           <div className="flex items-center space-x-2">
            <RadioGroupItem value="none" id="none" />
            <Label htmlFor="none">Don&apos;t notify, make available immediately</Label>
          </div>
        </RadioGroup>
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
              <th className="px-3 py-3 text-left w-10">
                <span className="sr-only">Select student</span>
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Name</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Email</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Class</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase w-48">Start Date</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase w-48">Due Date</th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {filteredStudents.map((student) => (
              <tr key={student.id}>
                <td className="px-3 py-4">
                  <Checkbox
                    id={`desktop-${student.id}`}
                    checked={selectedStudents.includes(student.id)}
                    onCheckedChange={(checked) => handleSelectStudent(student.id, !!checked)}
                  />
                </td>
                <td className="px-3 py-4 text-sm font-medium text-foreground max-w-[150px] truncate" title={student.name || ''}>{student.name}</td>
                <td className="px-3 py-4 text-sm text-muted-foreground max-w-[200px] truncate" title={student.email || ''}>{student.email}</td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-muted-foreground">
                  {student.currentClassName ?? (student.currentClassId ? 'Unknown class' : 'No class')}
                </td>
                <td className="px-3 py-4 whitespace-nowrap">
                  <Input
                    type="datetime-local"
                    value={startDates[student.id] || ''}
                    onChange={(e) => setStartDates((prev) => ({ ...prev, [student.id]: e.target.value }))}
                    className="text-xs h-8 w-full min-w-[160px]"
                    disabled={notificationOption === 'none'}
                  />
                </td>
                <td className="px-3 py-4 whitespace-nowrap">
                  <Input
                    type="datetime-local"
                    value={deadlines[student.id] || ''}
                    onChange={(e) => setDeadlines((prev) => ({ ...prev, [student.id]: e.target.value }))}
                    className="text-xs h-8 w-full min-w-[160px]"
                  />
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
                  <p className="text-sm text-muted-foreground">{student.email}</p>
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
  );
}
