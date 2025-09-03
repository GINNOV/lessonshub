// file: src/app/components/TeacherLessonList.tsx

'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Lesson, Assignment, AssignmentStatus } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getWeekAndDay } from '@/lib/utils';
import DeleteLessonButton from './DeleteLessonButton';
import WeekDivider from './WeekDivider';

type LessonWithAssignments = Lesson & {
  assignments: Pick<Assignment, 'status' | 'deadline'>[];
};

interface TeacherLessonListProps {
  lessons: LessonWithAssignments[];
}

export default function TeacherLessonList({ lessons }: TeacherLessonListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  const filteredLessons = useMemo(() => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

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
        const lessonDate = new Date(lesson.createdAt);
        if (dateFilter === 'today') {
          return lessonDate.toDateString() === now.toDateString();
        }
        if (dateFilter === 'last_week') {
          return lessonDate >= oneWeekAgo;
        }
        if (dateFilter === 'last_month') {
          return lessonDate >= oneMonthAgo;
        }
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
            <option value="last_week">Last Week</option>
            <option value="last_month">Last Month</option>
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
              const graded = lesson.assignments.filter(
                (a) => a.status === AssignmentStatus.GRADED
              ).length;
              const pending = lesson.assignments.filter(
                (a) => a.status === AssignmentStatus.PENDING && new Date(a.deadline) > now
              ).length;
              const pastDue = lesson.assignments.filter(
                (a) => a.status === AssignmentStatus.PENDING && new Date(a.deadline) <= now
              ).length;
              const failed = lesson.assignments.filter(
                (a) => a.status === AssignmentStatus.FAILED
              ).length;

              return (
                <div key={lesson.id}>
                  {showDivider && <WeekDivider weekNumber={lesson.week} />}
                  <li className="p-4 border rounded-md flex justify-between items-center">
                    <div>
                      <Link href={`/dashboard/edit/${lesson.id}`} className="font-bold text-lg hover:underline">
                        {lesson.title}
                      </Link>
                      <p className="text-xs text-gray-400 mt-1">
                        Lesson {getWeekAndDay(lesson.createdAt)} - Created on: {new Date(lesson.createdAt).toLocaleDateString()}
                      </p>
                      <div className="flex items-center space-x-2 mt-2">
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
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" asChild>
                        <Link href={`/dashboard/edit/${lesson.id}`}>Edit</Link>
                      </Button>
                      <Button variant="outline" asChild>
                        <Link href={`/dashboard/assign/${lesson.id}`}>Assign</Link>
                      </Button>
                      <Button asChild>
                        <Link href={`/dashboard/submissions/${lesson.id}`}>View Submissions</Link>
                      </Button>
                      <DeleteLessonButton lessonId={lesson.id} />
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