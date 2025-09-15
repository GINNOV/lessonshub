// file: src/app/components/TeacherLessonList.tsx
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Lesson, Assignment, AssignmentStatus, LessonType } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getWeekAndDay } from '@/lib/utils';
import DeleteLessonButton from './DeleteLessonButton';
import WeekDivider from './WeekDivider';
import { Pencil, UserPlus, Eye, Share2, Mail } from 'lucide-react';
import { generateShareLink } from '@/actions/lessonActions'; // ✅ Import the correct action
import { toast } from 'sonner'; // ✅ For user feedback

type LessonWithAssignments = Lesson & {
  assignments: Pick<Assignment, 'status' | 'deadline'>[];
};

interface TeacherLessonListProps {
  lessons: LessonWithAssignments[];
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

const lessonTypeEmojis: Record<LessonType, string> = {
  [LessonType.STANDARD]: '📝',
  [LessonType.FLASHCARD]: '🃏',
  [LessonType.MULTI_CHOICE]: '✅',
  [LessonType.LEARNING_SESSION]: '🧠',
};


export default function TeacherLessonList({ lessons }: TeacherLessonListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  // Replaced the old handleShareClick with the new async version.
  const handleShareClick = async (lessonId: string) => {
    const result = await generateShareLink(lessonId);
    if (result.success && result.url) {
      navigator.clipboard.writeText(result.url);
      toast.success('Public "Join Lesson" link copied to clipboard!');
    } else {
      toast.error(result.error || 'Failed to create share link.');
    }
  };

  const filteredLessons = useMemo(() => {
    // ... (Your existing filtering logic is perfect and remains here)
    const today = new Date();
    const todayStart = getStartOfDay(today);
    const thisWeek = getWeekBounds(today, WEEK_STARTS_ON);
    const lastWeekStart = new Date(thisWeek.start);
    lastWeekStart.setDate(thisWeek.start.getDate() - 7);
    const lastWeek = getWeekBounds(lastWeekStart, WEEK_STARTS_ON);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const thirtyDaysAgoStart = getStartOfDay(thirtyDaysAgo);
    return lessons
      .map(lesson => ({
        ...lesson,
        week: parseInt(getWeekAndDay(lesson.createdAt).split('-')[0], 10),
      }))
      .filter(lesson => lesson.title.toLowerCase().includes(searchTerm.toLowerCase()))
      .filter(lesson => {
        if (statusFilter === 'all') return true;
        return lesson.assignments.some(a => a.status === statusFilter);
      })
      .filter(lesson => {
        if (dateFilter === 'all') return true;
        const lessonDate = getStartOfDay(new Date(lesson.createdAt));
        if (dateFilter === 'today') return lessonDate.getTime() === todayStart.getTime();
        if (dateFilter === 'this_week') return lessonDate >= thisWeek.start && lessonDate <= thisWeek.end;
        if (dateFilter === 'last_week') return lessonDate >= lastWeek.start && lessonDate <= lastWeek.end;
        if (dateFilter === 'last_30_days') return lessonDate >= thirtyDaysAgoStart;
        return true;
      });
  }, [lessons, searchTerm, statusFilter, dateFilter]);

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
        <div className="flex gap-2">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
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
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border-gray-300 rounded-md shadow-sm"
          >
            <option value="all">All Statuses</option>
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
            {filteredLessons.map((lesson) => {
               const showDivider = lesson.week !== lastWeek;
               lastWeek = lesson.week;
               
              const now = new Date();
              const totalAssignments = lesson.assignments.length;
              const graded = lesson.assignments.filter(a => a.status === AssignmentStatus.GRADED).length;
              const pending = lesson.assignments.filter(a => a.status === AssignmentStatus.PENDING && new Date(a.deadline) > now).length;
              const pastDue = lesson.assignments.filter(a => a.status === AssignmentStatus.PENDING && new Date(a.deadline) <= now).length;
              const failed = lesson.assignments.filter(a => a.status === AssignmentStatus.FAILED).length;
              const firstDeadline = lesson.assignments[0]?.deadline;

              return (
                <div key={lesson.id}>
                  {showDivider && <WeekDivider weekNumber={lesson.week} />}
                  <li className="p-4 border rounded-md flex flex-col sm:flex-row justify-between items-start sm:items-center">
                    <div className="flex-1 mb-4 sm:mb-0">
                      <Link href={`/dashboard/edit/${lesson.id}`} className="font-bold text-lg hover:underline">
                        <span className="mr-2">{lessonTypeEmojis[lesson.type]}</span>
                        {lesson.title}
                      </Link>
                      <p className="text-xs text-gray-400 mt-1">
                        Lesson {getWeekAndDay(lesson.createdAt)} - Created on: {new Date(lesson.createdAt).toLocaleDateString()}
                        {firstDeadline && (
                            <span className="ml-2">| Deadline: {new Date(firstDeadline).toLocaleString()}</span>
                        )}
                      </p>
                      <div className="flex items-center space-x-2 mt-2 flex-wrap">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                          {totalAssignments} Assigned
                        </span>
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          {pending} Pending
                        </span>
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          {graded} Graded
                        </span>
                        {pastDue > 0 && (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                            {pastDue} Past Due
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
                        <Share2 className="h-4 w-4" />
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