// file: src/app/components/TeacherLessonList.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lesson, Assignment, AssignmentStatus, LessonType } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getWeekAndDay } from '@/lib/utils';
import DeleteLessonButton from './DeleteLessonButton';
import WeekDivider from './WeekDivider';
import { Pencil, UserPlus, Eye, Share2, Mail, Star, Check, Copy } from 'lucide-react';
import { duplicateLesson, generateShareLink } from '@/actions/lessonActions';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import LocaleDate from './LocaleDate';

type LessonAssignmentSummary = Pick<Assignment, 'status' | 'deadline' | 'startDate'> & {
  classId: string | null;
  className: string | null;
};

type SerializableLessonWithAssignments = Omit<Lesson, 'price'> & {
  price: number;
  assignments: LessonAssignmentSummary[];
  averageRating?: number | null;
};

interface TeacherLessonListProps {
  lessons: SerializableLessonWithAssignments[];
  classes: { id: string; name: string }[];
}

const WEEK_STARTS_ON: 0 | 1 = 1;

const getWeekBounds = (date: Date, weekStartsOn: 0 | 1 = 1) => {
  const day = date.getDay();
  const diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
  const start = new Date(date);
  start.setDate(date.getDate() - diff);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const getStartOfDay = (date: Date) => {
  const newDate = new Date(date);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
};

const isValidDate = (date: Date | null | undefined): date is Date => {
  return !!date && !Number.isNaN(date.getTime());
};

const lessonTypeEmojis: Record<LessonType, string> = {
  [LessonType.STANDARD]: '📝',
  [LessonType.FLASHCARD]: '🃏',
  [LessonType.MULTI_CHOICE]: '✅',
  [LessonType.LEARNING_SESSION]: '🧠',
};

const STORAGE_KEY = 'teacher-dashboard-filters';

type StatusFilterValue = AssignmentStatus | 'all' | 'past_due';
type OrderViewValue = 'deadline' | 'week' | 'available';
const STATUS_FILTER_VALUES: StatusFilterValue[] = [
  'all',
  'past_due',
  AssignmentStatus.PENDING,
  AssignmentStatus.COMPLETED,
  AssignmentStatus.GRADED,
  AssignmentStatus.FAILED,
];
const DATE_FILTER_VALUES = ['all', 'today', 'this_week', 'last_week', 'last_30_days'] as const;
const ORDER_VIEW_VALUES: OrderViewValue[] = ['deadline', 'week', 'available'];
type DateFilterValue = (typeof DATE_FILTER_VALUES)[number];

export default function TeacherLessonList({ lessons, classes }: TeacherLessonListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>(AssignmentStatus.PENDING);
  const [dateFilter, setDateFilter] = useState<DateFilterValue>('all');
  const [classFilter, setClassFilter] = useState('all');
  const [orderView, setOrderView] = useState<OrderViewValue>('deadline');
  const [copiedLessonId, setCopiedLessonId] = useState<string | null>(null);
  const [duplicatingLessonId, setDuplicatingLessonId] = useState<string | null>(null);
  const router = useRouter();
  const hasHydratedState = useRef(false);

  const handleShareClick = async (lessonId: string) => {
    const result = await generateShareLink(lessonId);
    if (result.success && result.url) {
      navigator.clipboard.writeText(result.url);
      toast.success('Public "Join Lesson" link copied to clipboard!');
      setCopiedLessonId(lessonId);
      setTimeout(() => setCopiedLessonId(null), 2000); // Reset after 2 seconds
    } else {
      toast.error(result.error || 'Failed to create share link.');
    }
  };

  const handleDuplicateClick = async (lessonId: string) => {
    setDuplicatingLessonId(lessonId);
    try {
      const result = await duplicateLesson(lessonId);
      if (result.success) {
        toast.success('Lesson duplicated.');
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to duplicate lesson.');
      }
    } catch (error) {
      console.error('DUPLICATE_LESSON_CLIENT_ERROR', error);
      toast.error('Failed to duplicate lesson.');
    } finally {
      setDuplicatingLessonId(null);
    }
  };

  type LessonWithMeta = SerializableLessonWithAssignments & {
    week: number;
  nextDeadline: Date | null;
  nextPendingDeadline: Date | null;
  nextOutstandingDeadline: Date | null;
  hasOutstandingAssignments: boolean;
  assignmentsWithDates: Array<
    LessonAssignmentSummary & {
      deadlineDate: Date | null;
      startDateValue: Date | null;
    }
  >;
  availableDate: Date | null;
  classNames: string[];
  filterDate: Date | null;
};

  const filteredLessons = useMemo<LessonWithMeta[]>(() => {
    const today = new Date();
    const todayStart = getStartOfDay(today);
    const thisWeek = getWeekBounds(today, WEEK_STARTS_ON);
    const lastWeekStart = new Date(thisWeek.start);
    lastWeekStart.setDate(thisWeek.start.getDate() - 7);
    const lastWeek = getWeekBounds(lastWeekStart, WEEK_STARTS_ON);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const thirtyDaysAgoStart = getStartOfDay(thirtyDaysAgo);
    const lessonsWithMeta: LessonWithMeta[] = lessons.map((lesson) => {
      const week = parseInt(getWeekAndDay(new Date(lesson.createdAt)).split('-')[0], 10);
      const scheduledDate = lesson.scheduled_assignment_date ? new Date(lesson.scheduled_assignment_date) : null;
      const scheduledDateValue = isValidDate(scheduledDate) ? scheduledDate : null;

      const assignmentsWithDates = lesson.assignments.map((assignment) => {
        const rawDeadline = assignment.deadline ? new Date(assignment.deadline) : null;
        const deadlineDate = isValidDate(rawDeadline) ? rawDeadline : null;
        const rawStart = assignment.startDate ? new Date(assignment.startDate) : null;
        const startDateValue = isValidDate(rawStart) ? rawStart : null;

        return {
          ...assignment,
          deadlineDate,
          startDateValue,
        };
      });

      const validDeadlines = assignmentsWithDates
        .filter(({ deadlineDate }) => deadlineDate !== null)
        .sort((a, b) => (a.deadlineDate!.getTime() - b.deadlineDate!.getTime()));

      const pendingAssignments = assignmentsWithDates
        .filter((assignment) => assignment.status === AssignmentStatus.PENDING && assignment.deadlineDate !== null)
        .sort((a, b) => (a.deadlineDate!.getTime() - b.deadlineDate!.getTime()));

      const outstandingAssignments = assignmentsWithDates
        .filter((assignment) => assignment.status !== AssignmentStatus.GRADED && assignment.deadlineDate !== null)
        .sort((a, b) => (a.deadlineDate!.getTime() - b.deadlineDate!.getTime()));

      const nextDeadline = validDeadlines[0]?.deadlineDate ?? null;
      const nextPendingDeadline = pendingAssignments[0]?.deadlineDate ?? null;
      const nextOutstandingDeadline = outstandingAssignments[0]?.deadlineDate ?? null;
      const startDates = assignmentsWithDates
        .map((assignment) => assignment.startDateValue)
        .filter((date): date is Date => !!date)
        .sort((a, b) => a.getTime() - b.getTime());
      const availableDate = startDates[0] ?? scheduledDateValue ?? null;
      const classNames = Array.from(
        new Set(
          assignmentsWithDates
            .map((assignment) => assignment.className)
            .filter((name): name is string => !!name && name.trim().length > 0)
        )
      );
      const hasOutstandingAssignments = lesson.assignments.some(a => a.status !== AssignmentStatus.GRADED);
      const createdAtDate = new Date(lesson.createdAt);
      const filterDate =
        nextPendingDeadline ??
        nextOutstandingDeadline ??
        nextDeadline ??
        availableDate ??
        (validDeadlines[0]?.deadlineDate ?? null) ??
        (assignmentsWithDates[0]?.deadlineDate ?? null) ??
        createdAtDate;

      return {
        ...lesson,
        week,
        nextDeadline,
        nextPendingDeadline,
        nextOutstandingDeadline,
        hasOutstandingAssignments,
        assignmentsWithDates,
        availableDate,
        classNames,
        filterDate,
      };
    });

    const filtered = lessonsWithMeta
      .filter(lesson => lesson.title.toLowerCase().includes(searchTerm.toLowerCase()))
      .filter(lesson => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'past_due') {
          return lesson.assignmentsWithDates.some(a => {
            if (a.status !== AssignmentStatus.PENDING || !a.deadlineDate) return false;
            return a.deadlineDate <= today;
          });
        }
        return lesson.assignmentsWithDates.some(a => a.status === statusFilter);
      })
      .filter(lesson => {
        if (classFilter === 'all') return true;
        if (classFilter === 'unassigned') {
          return lesson.assignmentsWithDates.length === 0 || lesson.assignmentsWithDates.every(a => !a.classId);
        }
        return lesson.assignmentsWithDates.some(a => a.classId === classFilter);
      })
      .filter(lesson => {
        if (dateFilter === 'all') return true;
        const referenceDate = lesson.filterDate ?? new Date(lesson.createdAt);
        const referenceStart = getStartOfDay(referenceDate);
        if (dateFilter === 'today') return referenceStart.getTime() === todayStart.getTime();
        if (dateFilter === 'this_week') return referenceStart >= thisWeek.start && referenceStart <= thisWeek.end;
        if (dateFilter === 'last_week') return referenceStart >= lastWeek.start && referenceStart <= lastWeek.end;
        if (dateFilter === 'last_30_days') return referenceStart >= thirtyDaysAgoStart;
        return true;
      })
      .sort((a, b) => {
        if (orderView === 'week') {
          return b.week - a.week || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }

        if (orderView === 'available') {
          const aAvailable = a.availableDate ?? new Date(a.createdAt);
          const bAvailable = b.availableDate ?? new Date(b.createdAt);
          const diff = aAvailable.getTime() - bAvailable.getTime();
          if (diff !== 0) return diff;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }

        // Deadline ordering focuses on lessons with outstanding work first.
        if (a.hasOutstandingAssignments && !b.hasOutstandingAssignments) return -1;
        if (!a.hasOutstandingAssignments && b.hasOutstandingAssignments) return 1;

        const aDeadline = a.nextPendingDeadline ?? a.nextOutstandingDeadline ?? a.nextDeadline;
        const bDeadline = b.nextPendingDeadline ?? b.nextOutstandingDeadline ?? b.nextDeadline;

        if (!aDeadline && !bDeadline) {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (!aDeadline) return 1;
        if (!bDeadline) return -1;
        return aDeadline.getTime() - bDeadline.getTime();
      });

    if (orderView === 'deadline') {
      const active = filtered.filter(lesson => lesson.hasOutstandingAssignments);
      const completed = filtered.filter(lesson => !lesson.hasOutstandingAssignments);
      return [
        ...active.sort((a, b) => {
          const aDeadline = a.nextPendingDeadline ?? a.nextOutstandingDeadline ?? a.nextDeadline;
          const bDeadline = b.nextPendingDeadline ?? b.nextOutstandingDeadline ?? b.nextDeadline;
          if (!aDeadline && !bDeadline) {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          }
          if (!aDeadline) return 1;
          if (!bDeadline) return -1;
          return aDeadline.getTime() - bDeadline.getTime();
        }),
        ...completed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      ];
    }

    return filtered;
  }, [lessons, searchTerm, statusFilter, dateFilter, classFilter, orderView]);

  useEffect(() => {
    if (!hasHydratedState.current) {
      return;
    }
    const stateToStore = {
      searchTerm,
      statusFilter,
      dateFilter,
      classFilter,
      orderView,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToStore));
    } catch (error) {
      console.warn('Unable to persist teacher dashboard filters', error);
    }
  }, [searchTerm, statusFilter, dateFilter, classFilter, orderView]);

  useEffect(() => {
    if (hasHydratedState.current) {
      return;
    }
    hasHydratedState.current = true;
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      if (!stored) {
        return;
      }
      const parsed = JSON.parse(stored) as {
        searchTerm?: string;
        statusFilter?: StatusFilterValue;
        dateFilter?: string;
        classFilter?: string;
        orderView?: OrderViewValue;
      };
      if (typeof parsed.searchTerm === 'string') setSearchTerm(parsed.searchTerm);
      if (parsed.statusFilter && STATUS_FILTER_VALUES.includes(parsed.statusFilter)) {
        setStatusFilter(parsed.statusFilter);
      }
      if (parsed.dateFilter && DATE_FILTER_VALUES.includes(parsed.dateFilter as DateFilterValue)) {
        setDateFilter(parsed.dateFilter as DateFilterValue);
      }
      if (typeof parsed.classFilter === 'string') setClassFilter(parsed.classFilter);
      if (parsed.orderView && ORDER_VIEW_VALUES.includes(parsed.orderView)) {
        setOrderView(parsed.orderView);
      }
    } catch (error) {
      console.warn('Unable to restore teacher dashboard filters', error);
    }
  }, []);

  let lastWeek: number | null = null;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <Input
          type="search"
          placeholder="Search lessons..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex gap-2 flex-wrap justify-end">
          <select
            value={orderView}
            onChange={(e) => setOrderView(e.target.value as OrderViewValue)}
            className="border-gray-300 rounded-md shadow-sm"
          >
            <option value="deadline">Deadline (Asc)</option>
            <option value="week">Week Order</option>
            <option value="available">Available Order</option>
          </select>
          {classes.length > 0 && (
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="border-gray-300 rounded-md shadow-sm"
            >
              <option value="all">All Classes</option>
              <option value="unassigned">Unassigned</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          )}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as DateFilterValue)}
            className="border-gray-300 rounded-md shadow-sm"
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="this_week">This Week</option>
            <option value="last_week">Last Week</option>
            <option value="last_30_days">Last 30 Days</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilterValue)}
            className="border-gray-300 rounded-md shadow-sm"
          >
            <option value="all">All Statuses</option>
            <option value="past_due">Past Due</option>
            <option value={AssignmentStatus.PENDING}>Pending</option>
            <option value={AssignmentStatus.COMPLETED}>Completed</option>
            <option value={AssignmentStatus.GRADED}>Graded</option>
            <option value={AssignmentStatus.FAILED}>Failed</option>
          </select>
        </div>
      </div>

      <div className="mt-6 bg-white shadow-md rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-4">Your Lessons</h2>
        {filteredLessons.length > 0 ? (
          <ul className="space-y-4">
            {filteredLessons.map((lesson, index) => {
               const showDivider = lesson.week !== lastWeek;
               lastWeek = lesson.week;

              const now = new Date();
              const totalAssignments = lesson.assignments.length;
              const graded = lesson.assignmentsWithDates.filter(a => a.status === AssignmentStatus.GRADED).length;
              const completed = lesson.assignmentsWithDates.filter(a => a.status === AssignmentStatus.COMPLETED).length;
              const pendingUpcoming = lesson.assignmentsWithDates.filter(a => a.status === AssignmentStatus.PENDING && (!a.deadlineDate || a.deadlineDate > now)).length;
              const pastDue = lesson.assignmentsWithDates.filter(a => a.status === AssignmentStatus.PENDING && a.deadlineDate && a.deadlineDate <= now).length;
              const failed = lesson.assignmentsWithDates.filter(a => a.status === AssignmentStatus.FAILED).length;
              const firstDeadline = lesson.nextPendingDeadline ?? lesson.nextOutstandingDeadline ?? lesson.nextDeadline;
              const classNamesDisplay = lesson.classNames.length
                ? lesson.classNames.join(', ')
                : (totalAssignments > 0 ? 'Unassigned' : '—');
              const allStudentsProcessed = lesson.assignmentsWithDates.length > 0 && lesson.assignmentsWithDates.every(a => a.status === AssignmentStatus.GRADED || a.status === AssignmentStatus.FAILED);

              return (
                <div key={lesson.id}>
                  {showDivider && <WeekDivider weekNumber={lesson.week} />}
                  <li className={cn(
                      "p-4 border rounded-md flex flex-col sm:flex-row justify-between items-start sm:items-center",
                      totalAssignments === 0 && "bg-red-50 border-red-200",
                      allStudentsProcessed && totalAssignments > 0 && "bg-blue-50 border-blue-200",
                      totalAssignments > 0 && !allStudentsProcessed && index % 2 !== 0 && "bg-slate-50"
                  )}>
                    <div className="flex-1 mb-4 sm:mb-0">
                      <div className="flex items-center gap-2">
                        <Link href={`/dashboard/edit/${lesson.id}`} className="font-bold text-lg hover:underline">
                          <span className="mr-2">{lessonTypeEmojis[lesson.type]}</span>
                          {lesson.title}
                        </Link>
                        {lesson.averageRating && (
                            <div className="flex items-center gap-1 text-yellow-500">
                                <Star className="h-4 w-4 fill-current" />
                                <span className="text-sm font-bold">{lesson.averageRating.toFixed(1)}</span>
                            </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1 flex flex-wrap gap-2">
                        <span>Lesson {getWeekAndDay(new Date(lesson.createdAt))}</span>
                        <span>| Available: {lesson.availableDate ? <LocaleDate date={lesson.availableDate} options={{ year: 'numeric', month: 'numeric', day: 'numeric' }} /> : '—'}</span>
                        <span>| Deadline: {firstDeadline ? <LocaleDate date={firstDeadline} options={{ year: 'numeric', month: 'numeric', day: 'numeric' }} /> : '—'}</span>
                        <span>| Class: {classNamesDisplay}</span>
                      </p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                          {totalAssignments} Assigned
                        </span>
                        {pendingUpcoming > 0 && (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            {pendingUpcoming} Pending
                          </span>
                        )}
                        {pastDue > 0 && (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                            {pastDue} Past Due
                          </span>
                        )}
                        {completed > 0 && (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {completed} Completed
                          </span>
                        )}
                        {graded > 0 && (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            {graded} Graded
                          </span>
                        )}
                        {failed > 0 && (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-200 text-red-900">
                            {failed} Failed
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 flex-wrap justify-end">
                      <Button variant="outline" size="icon" onClick={() => handleShareClick(lesson.id)} title="Share Lesson">
                        {copiedLessonId === lesson.id ? <Check className="h-4 w-4 text-green-500" /> : <Share2 className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDuplicateClick(lesson.id)}
                        disabled={duplicatingLessonId === lesson.id}
                        title={duplicatingLessonId === lesson.id ? 'Duplicating...' : 'Duplicate Lesson'}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" asChild title="Edit Lesson">
                        <Link href={`/dashboard/edit/${lesson.id}`}><Pencil className="h-4 w-4" /></Link>
                      </Button>
                      <Button variant="outline" size="icon" asChild title="Assign Lesson">
                        <Link href={`/dashboard/assign/${lesson.id}`}><UserPlus className="h-4 w-4" /></Link>
                      </Button>
                      <Button variant="outline" size="icon" asChild title="View Submissions">
                        <Link href={`/dashboard/submissions/${lesson.id}`}><Eye className="h-4 w-4" /></Link>
                      </Button>
                      <Button variant="outline" size="icon" asChild title="Send Custom Email">
                        <Link href={`/dashboard/email/${lesson.id}`}><Mail className="h-4 w-4" /></Link>
                      </Button>
                      <DeleteLessonButton lessonId={lesson.id} isIcon={true} />
                    </div>
                  </li>
                </div>
              );
            })}
          </ul>
        ) : (
          <p>No lessons match your criteria.</p>
        )}
      </div>
    </div>
  );
}
