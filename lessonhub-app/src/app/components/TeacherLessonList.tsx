// file: src/app/components/TeacherLessonList.tsx

'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Lesson, Assignment, AssignmentStatus } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getWeekAndDay } from '@/lib/utils';
import DeleteLessonButton from './DeleteLessonButton';

type LessonWithAssignments = Lesson & {
  assignments: Pick<Assignment, 'status' | 'deadline'>[];
};

interface TeacherLessonListProps {
  lessons: LessonWithAssignments[];
}

export default function TeacherLessonList({ lessons }: TeacherLessonListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredLessons = useMemo(() => {
    return lessons
      .filter(lesson => lesson.title.toLowerCase().includes(searchTerm.toLowerCase()))
      .filter(lesson => {
        if (statusFilter === 'all') return true;
        return lesson.assignments.some(a => a.status === statusFilter);
      });
  }, [lessons, searchTerm, statusFilter]);

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

      <div className="mt-6 bg-white shadow-md rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-4">Your Lessons</h2>
        {filteredLessons.length > 0 ? (
          <ul className="space-y-4">
            {filteredLessons.map((lesson) => {
              const now = new Date();
              const graded = lesson.assignments.filter(
                (a) => a.status === AssignmentStatus.GRADED
              ).length;
              const pending = lesson.assignments.filter(
                (a) => a.status === AssignmentStatus.PENDING && new Date(a.deadline) > now
              ).length;
              const pastDue = lesson.assignments.filter(
                (a) => a.status === AssignmentStatus.PENDING && new Date(a.deadline) <= now
              ).length;

              return (
                <li key={lesson.id} className="p-4 border rounded-md flex justify-between items-center">
                  <div>
                    <Link href={`/dashboard/edit/${lesson.id}`} className="font-bold text-lg hover:underline">
                      {lesson.title}
                    </Link>
                    <p className="text-xs text-gray-400 mt-1">
                      Lesson {getWeekAndDay(lesson.createdAt)} - Created on: {new Date(lesson.createdAt).toLocaleDateString()}
                    </p>
                    <div className="flex items-center space-x-2 mt-2">
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