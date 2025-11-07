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
import { Pencil, UserPlus, Eye, Share2, Mail, Star, Check, Copy, Trash2 } from 'lucide-react';
import { duplicateLesson, generateShareLink } from '@/actions/lessonActions';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import LocaleDate from './LocaleDate';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LessonDifficultyIndicator, DIFFICULTY_OPTIONS } from '@/app/components/LessonDifficultySelector';

type LessonAssignmentSummary = Pick<Assignment, 'status' | 'deadline' | 'startDate'> & {
  classId: string | null;
  className: string | null;
};

type SerializableLessonWithAssignments = Omit<Lesson, 'price'> & {
  price: number;
  assignments: LessonAssignmentSummary[];
  averageRating?: number | null;
  guideIsVisible?: boolean;
  guideIsFreeForAll?: boolean;
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

const getEndOfDay = (date: Date) => {
  const newDate = new Date(date);
  newDate.setHours(23, 59, 59, 999);
  return newDate;
};

const formatDateInput = (date: Date) => {
  const pad = (value: number) => value.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const isValidDate = (date: Date | null | undefined): date is Date => {
  return !!date && !Number.isNaN(date.getTime());
};

const lessonTypeEmojis: Record<LessonType, string> = {
  [LessonType.STANDARD]: '📝',
  [LessonType.FLASHCARD]: '🃏',
  [LessonType.MULTI_CHOICE]: '✅',
  [LessonType.LEARNING_SESSION]: '🧠',
  [LessonType.LYRIC]: '🎵',
};

const STORAGE_KEY = 'teacher-dashboard-filters';

type StatusFilterValue = AssignmentStatus | 'all' | 'past_due' | 'empty_class';
type OrderViewValue = 'deadline' | 'week' | 'available';
const STATUS_FILTER_VALUES: StatusFilterValue[] = [
  'all',
  'past_due',
  'empty_class',
  AssignmentStatus.PENDING,
  AssignmentStatus.COMPLETED,
  AssignmentStatus.GRADED,
  AssignmentStatus.FAILED,
];
const DATE_FILTER_VALUES = ['today', 'this_week', 'last_week', 'this_month', 'this_year', 'custom'] as const;
const ORDER_VIEW_VALUES: OrderViewValue[] = ['deadline', 'week', 'available'];
type DateFilterValue = (typeof DATE_FILTER_VALUES)[number];

const STATUS_LEGEND = [
  {
    label: 'Pending',
    badgeClass: 'bg-yellow-100 text-yellow-800',
    description: 'Students received the lesson but have not submitted their work yet.',
  },
  {
    label: 'Completed',
    badgeClass: 'bg-blue-100 text-blue-800',
    description: 'Students submitted their answers but grading is still pending.',
  },
  {
    label: 'Graded',
    badgeClass: 'bg-green-100 text-green-800',
    description: 'All submissions were graded and scores are final.',
  },
  {
    label: 'Past Due',
    badgeClass: 'bg-red-100 text-red-800',
    description: 'The deadline passed and the student still has not submitted the lesson.',
  },
  {
    label: 'Failed',
    badgeClass: 'bg-red-200 text-red-900',
    description: 'The lesson was marked as failed for the student.',
  },
] as const;

const CARD_STATE_LEGEND = [
  {
    label: 'No students assigned',
    swatchClass: 'bg-red-50 border border-red-200',
    description: 'Lessons with zero assignments are highlighted to show they still need students.',
  },
  {
    label: 'Grading complete',
    swatchClass: 'bg-blue-50 border border-blue-200',
    description: 'All students have been graded or marked failed for this lesson.',
  },
  {
    label: 'Mixed progress',
    swatchClass: 'bg-slate-50 border border-slate-200',
    description: 'Some students still require attention—keep working through the list.',
  },
] as const;

const BUTTON_LEGEND = [
  {
    label: 'Share',
    description: 'Copies the public “Join Lesson” link so students can self-enroll.',
    icon: Share2,
  },
  {
    label: 'Duplicate',
    description: 'Creates a copy of the lesson with the same content so you can reuse it.',
    icon: Copy,
  },
  {
    label: 'Assign',
    description: 'Opens the assignment workflow to schedule the lesson for students.',
    icon: UserPlus,
  },
  {
    label: 'Submissions',
    description: 'Reviews student submissions and tracks their status in detail.',
    icon: Eye,
  },
  {
    label: 'Email',
    description: 'Starts a custom email draft to follow up with students about this lesson.',
    icon: Mail,
  },
  {
    label: 'Edit',
    description: 'Opens the lesson editor so you can update the content.',
    icon: Pencil,
  },
  {
    label: 'Delete (trash icon)',
    description: 'Permanently removes the lesson after confirmation.',
    icon: Trash2,
  },
] as const;

const FILTER_LEGEND = [
  {
    label: 'Status Filter',
    description: 'Focus on lessons with specific assignment statuses or highlight past-due work.',
  },
  {
    label: 'Date Filter',
    description: 'Zoom in on assignments due today, this week, last week, or pick a custom range.',
  },
  {
    label: 'Class Filter',
    description: 'Limit the list to students in a specific class or to lessons still unassigned.',
  },
  {
    label: 'Order',
    description: 'Switch between deadline priority, week groups, or the original availability date.',
  },
] as const;

export default function TeacherLessonList({ lessons, classes }: TeacherLessonListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>(AssignmentStatus.PENDING);
  const [dateFilter, setDateFilter] = useState<DateFilterValue>('this_week');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [classFilter, setClassFilter] = useState('all');
  const [orderView, setOrderView] = useState<OrderViewValue>('week');
  const [copiedLessonId, setCopiedLessonId] = useState<string | null>(null);
  const [duplicatingLessonId, setDuplicatingLessonId] = useState<string | null>(null);
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [guideActionLessonId, setGuideActionLessonId] = useState<string | null>(null);
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

  const handleDateFilterChange = (value: DateFilterValue) => {
    if (value === 'custom') {
      const today = new Date();
      const defaultEnd = formatDateInput(today);
      const defaultStartDate = new Date(today);
      defaultStartDate.setDate(today.getDate() - 7);

      if (!customStartDate) {
        setCustomStartDate(formatDateInput(defaultStartDate));
      }
      if (!customEndDate) {
        setCustomEndDate(defaultEnd);
      }
    }
    setDateFilter(value);
  };

  const updateGuideSettings = async (
    lessonId: string,
    payload: Partial<{ guideIsVisible: boolean; guideIsFreeForAll: boolean }>
  ) => {
    setGuideActionLessonId(lessonId);
    try {
      const response = await fetch(`/api/guides/${lessonId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Failed to update guide settings.');
      }
      toast.success('Guide settings updated.');
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message || 'Failed to update guide settings.');
    } finally {
      setGuideActionLessonId(null);
    }
  };

  const handleCustomStartChange = (value: string) => {
    setCustomStartDate(value);
    if (customEndDate && value && value > customEndDate) {
      setCustomEndDate(value);
    }
  };

  const handleCustomEndChange = (value: string) => {
    setCustomEndDate(value);
    if (customStartDate && value && value < customStartDate) {
      setCustomStartDate(value);
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
    const monthAnchor = new Date(today.getFullYear(), today.getMonth(), 1);
    const thisMonthStart = getStartOfDay(monthAnchor);
    const monthEndAnchor = new Date(thisMonthStart);
    monthEndAnchor.setMonth(monthEndAnchor.getMonth() + 1);
    monthEndAnchor.setMilliseconds(monthEndAnchor.getMilliseconds() - 1);
    const thisMonthEnd = monthEndAnchor;
    const thisYearStart = getStartOfDay(new Date(today.getFullYear(), 0, 1));
    const thisYearEnd = getEndOfDay(new Date(today.getFullYear(), 11, 31));
    const parsedCustomStart = customStartDate ? new Date(customStartDate) : null;
    const parsedCustomEnd = customEndDate ? new Date(customEndDate) : null;
    const customStart = isValidDate(parsedCustomStart) ? getStartOfDay(parsedCustomStart) : null;
    const customEnd = isValidDate(parsedCustomEnd) ? getEndOfDay(parsedCustomEnd) : null;
    const lessonsWithMeta: LessonWithMeta[] = lessons.map((lesson) => {
      const isGuide = lesson.type === LessonType.LEARNING_SESSION;
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
        isGuide,
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
        if (statusFilter === 'empty_class') {
          return lesson.assignmentsWithDates.length === 0;
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
        const referenceDate = lesson.filterDate ?? new Date(lesson.createdAt);
        const referenceStart = getStartOfDay(referenceDate);
        if (dateFilter === 'today') return referenceStart.getTime() === todayStart.getTime();
        if (dateFilter === 'this_week') return referenceStart >= thisWeek.start && referenceStart <= thisWeek.end;
        if (dateFilter === 'last_week') return referenceStart >= lastWeek.start && referenceStart <= lastWeek.end;
        if (dateFilter === 'this_month') return referenceStart >= thisMonthStart && referenceStart <= thisMonthEnd;
        if (dateFilter === 'this_year') return referenceStart >= thisYearStart && referenceStart <= thisYearEnd;
        if (dateFilter === 'custom') {
          if (customStart && customEnd) {
            return referenceStart >= customStart && referenceStart <= customEnd;
          }
          return true;
        }
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
  }, [lessons, searchTerm, statusFilter, dateFilter, classFilter, orderView, customStartDate, customEndDate]);

  useEffect(() => {
    if (!hasHydratedState.current) {
      return;
    }
    const stateToStore = {
      searchTerm,
      statusFilter,
      dateFilter,
      customStartDate,
      customEndDate,
      classFilter,
      orderView,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToStore));
    } catch (error) {
      console.warn('Unable to persist teacher dashboard filters', error);
    }
  }, [searchTerm, statusFilter, dateFilter, customStartDate, customEndDate, classFilter, orderView]);

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
        customStartDate?: string;
        customEndDate?: string;
        classFilter?: string;
        orderView?: OrderViewValue;
      };
      if (typeof parsed.searchTerm === 'string') setSearchTerm(parsed.searchTerm);
      if (parsed.statusFilter && STATUS_FILTER_VALUES.includes(parsed.statusFilter)) {
        setStatusFilter(parsed.statusFilter);
      }
      if (typeof parsed.customStartDate === 'string') setCustomStartDate(parsed.customStartDate);
      if (typeof parsed.customEndDate === 'string') setCustomEndDate(parsed.customEndDate);
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

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      const isMetaShortcut = event.metaKey || event.ctrlKey;
      const isHelpCombo =
        event.key === '?' ||
        (event.key === '/' && event.shiftKey);

      if (isMetaShortcut && isHelpCombo) {
        event.preventDefault();
        setIsLegendOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, []);

  const { weekGroups, weekSequence } = useMemo(() => {
    const groups = new Map<number, LessonWithMeta[]>();
    const sequence: number[] = [];

    filteredLessons.forEach((lesson) => {
      if (!groups.has(lesson.week)) {
        groups.set(lesson.week, []);
        sequence.push(lesson.week);
      }
      groups.get(lesson.week)!.push(lesson);
    });

    return { weekGroups: groups, weekSequence: sequence };
  }, [filteredLessons]);

  const weekRenderingOrder = useMemo(
    () => [...weekSequence].sort((a, b) => b - a),
    [weekSequence]
  );

  const renderLessonCard = (lesson: LessonWithMeta, index: number, key?: string) => {
    const isGuide = lesson.type === LessonType.LEARNING_SESSION;
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
    const normalizedDifficulty = Math.min(Math.max((lesson.difficulty ?? 3), 1), 5);
    const difficultyOption = DIFFICULTY_OPTIONS[normalizedDifficulty - 1];
    const chipBg = difficultyOption.color.replace('500', '100');
    const chipBorder = difficultyOption.color.replace('500', '200');

    if (isGuide) {
      const createdAtDate = new Date(lesson.createdAt);
      const [weekLabel, dayLabel] = getWeekAndDay(createdAtDate).split('-');
      const createdStamp = createdAtDate.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      const guideActionLoading = guideActionLessonId === lesson.id;

      return (
        <div
          key={key ?? `guide-${lesson.id}`}
          className="flex flex-col gap-4 rounded-md border border-green-200 bg-green-50 p-4"
        >
          <div className="flex flex-col gap-2">
            <Link href={`/dashboard/edit/${lesson.id}`} className="text-lg font-bold hover:underline">
              <span className="mr-2">{lessonTypeEmojis[lesson.type]}</span>
              {lesson.title}
            </Link>
            <p className="text-xs text-green-900">
              Guide {weekLabel}-{dayLabel} · Created {createdStamp}
            </p>
            <span
              className={cn(
                'w-fit inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide',
                chipBg,
                chipBorder,
                difficultyOption.text
              )}
            >
              <span className={cn('h-2 w-2 rounded-full', difficultyOption.color)} aria-hidden="true" />
              {difficultyOption.label}
            </span>
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span
                className={cn(
                  'rounded-full px-3 py-1',
                  lesson.guideIsVisible ? 'bg-emerald-200 text-emerald-900' : 'bg-gray-300 text-gray-700'
                )}
              >
                {lesson.guideIsVisible ? 'Visible in student catalog' : 'Hidden from students'}
              </span>
              <span
                className={cn(
                  'rounded-full px-3 py-1',
                  lesson.guideIsFreeForAll ? 'bg-blue-200 text-blue-900' : 'bg-indigo-200 text-indigo-900'
                )}
              >
                {lesson.guideIsFreeForAll ? 'Free for all plans' : 'Premium students only'}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => updateGuideSettings(lesson.id, { guideIsVisible: !lesson.guideIsVisible })}
                disabled={guideActionLoading}
              >
                {lesson.guideIsVisible ? 'Hide from catalog' : 'Show to students'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => updateGuideSettings(lesson.id, { guideIsFreeForAll: !lesson.guideIsFreeForAll })}
                disabled={guideActionLoading}
              >
                {lesson.guideIsFreeForAll ? 'Restrict to paying students' : 'Make free for all'}
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => handleDuplicateClick(lesson.id)} title="Duplicate Guide">
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" asChild title="Edit Guide">
                <Link href={`/dashboard/edit/${lesson.id}`}>
                  <Pencil className="h-4 w-4" />
                </Link>
              </Button>
              <DeleteLessonButton lessonId={lesson.id} isIcon />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        key={key ?? `lesson-${lesson.id}`}
        className={cn(
          "p-4 border rounded-md flex flex-col sm:flex-row justify-between items-start sm:items-center",
          totalAssignments === 0 && "bg-red-50 border-red-200",
          allStudentsProcessed && totalAssignments > 0 && "bg-blue-50 border-blue-200",
          totalAssignments > 0 && !allStudentsProcessed && index % 2 !== 0 && "bg-slate-50"
        )}
      >
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
          <span
            className={cn(
              'mt-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide',
              chipBg,
              chipBorder,
              difficultyOption.text
            )}
          >
            <span className={cn('h-2 w-2 rounded-full', difficultyOption.color)} aria-hidden="true" />
            {difficultyOption.label}
          </span>
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
      </div>
    );
  };

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
            onChange={(e) => handleDateFilterChange(e.target.value as DateFilterValue)}
            className="border-gray-300 rounded-md shadow-sm"
          >
            <option value="today">Today</option>
            <option value="this_week">This Week</option>
            <option value="last_week">Past Week</option>
            <option value="this_month">This Month</option>
            <option value="this_year">This Year</option>
            <option value="custom">Custom</option>
          </select>
          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">From</span>
              <Input
                type="date"
                value={customStartDate}
                onChange={(e) => handleCustomStartChange(e.target.value)}
                max={customEndDate || undefined}
                className="w-36"
              />
              <span className="text-sm text-gray-500">to</span>
              <Input
                type="date"
                value={customEndDate}
                onChange={(e) => handleCustomEndChange(e.target.value)}
                min={customStartDate || undefined}
                className="w-36"
              />
            </div>
          )}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilterValue)}
            className="border-gray-300 rounded-md shadow-sm"
          >
            <option value="all">All Statuses</option>
            <option value="past_due">Past Due</option>
            <option value="empty_class">Empty Class</option>
            <option value={AssignmentStatus.PENDING}>Pending</option>
            <option value={AssignmentStatus.COMPLETED}>Completed</option>
            <option value={AssignmentStatus.GRADED}>Graded</option>
            <option value={AssignmentStatus.FAILED}>Failed</option>
          </select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => setIsLegendOpen(true)}
          >
            <span aria-hidden="true" className="text-base font-semibold">
              ?
            </span>
            <span className="sr-only">Open legend (Cmd + Shift + /)</span>
          </Button>
        </div>
      </div>

      <div className="mt-6 bg-white shadow-md rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-4">Your Lessons</h2>
        {filteredLessons.length > 0 ? (
          <div className="space-y-6">
            {(() => {
              let globalIndex = 0;
              return weekRenderingOrder.map((week) => (
                <div key={`week-${week}`} className="space-y-4">
                  <WeekDivider weekNumber={week} />
                  <div className="space-y-4">
                    {(weekGroups.get(week) ?? []).map((lesson) =>
                      renderLessonCard(lesson, globalIndex++, `lesson-${lesson.id}`)
                    )}
                  </div>
                </div>
              ));
            })()}
          </div>
        ) : (
          <p>No lessons match your criteria.</p>
        )}
      </div>
      <Dialog open={isLegendOpen} onOpenChange={setIsLegendOpen}>
        <DialogContent className="w-[95vw] max-w-4xl sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Dashboard legend</DialogTitle>
            <DialogDescription>
              Press Cmd + Shift + / (or Ctrl + Shift + /) anytime to reopen this cheat sheet.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 text-sm text-gray-600 sm:grid-cols-2">
            <section>
              <p className="text-xs font-semibold uppercase text-gray-500">Status colors</p>
              <div className="mt-3 space-y-2">
                {STATUS_LEGEND.map((status) => (
                  <div key={status.label} className="flex items-start gap-3">
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${status.badgeClass}`}>
                      {status.label}
                    </span>
                    <p className="flex-1 leading-relaxed">{status.description}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <p className="text-xs font-semibold uppercase text-gray-500">Card backgrounds</p>
              <div className="mt-3 space-y-2">
                {CARD_STATE_LEGEND.map((card) => (
                  <div key={card.label} className="flex items-start gap-3">
                    <span className={`h-5 w-5 rounded-md ${card.swatchClass}`} aria-hidden="true" />
                    <div className="leading-relaxed">
                      <p className="font-semibold text-gray-800">{card.label}</p>
                      <p>{card.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <p className="text-xs font-semibold uppercase text-gray-500">Filters & ordering</p>
              <div className="mt-3 space-y-2">
                {FILTER_LEGEND.map((filter) => (
                  <div key={filter.label} className="leading-relaxed">
                    <p className="font-semibold text-gray-800">{filter.label}</p>
                    <p>{filter.description}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <p className="text-xs font-semibold uppercase text-gray-500">Action buttons</p>
              <div className="mt-3 space-y-2">
                {BUTTON_LEGEND.map((action) => (
                  <div key={action.label} className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex rounded-md border border-gray-200 bg-gray-50 p-1.5 text-gray-700">
                      <action.icon className="h-4 w-4" />
                    </span>
                    <div className="leading-relaxed">
                      <p className="font-semibold text-gray-800">{action.label}</p>
                      <p>{action.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
      </DialogContent>
      </Dialog>
    </div>
  );
}
