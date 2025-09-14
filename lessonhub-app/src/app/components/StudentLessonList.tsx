// file: src/app/components/StudentLessonList.tsx
'use client';

import { useState, useMemo } from 'react';
import {
  Assignment,
  Lesson,
  User,
  AssignmentStatus,
  LessonType,
} from '@prisma/client';
import { Input } from '@/components/ui/input';
import StudentLessonCard, {
  SerializableAssignment, // ✅ Import the clean type
} from './StudentLessonCard'; // Import the card component and its type
import WeekDivider from './WeekDivider';
import { getWeekAndDay } from '@/lib/utils';

interface StudentLessonListProps {
  assignments: SerializableAssignment[]; // ✅ Use the clean, serializable type
}

export default function StudentLessonList({
  assignments,
}: StudentLessonListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const groupedAndSortedAssignments = useMemo(() => {
    const filtered = assignments.filter(
      (a) =>
        a.lesson.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.lesson.teacher?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const grouped: { [key: string]: SerializableAssignment[] } = {
      pending: filtered.filter((a) => a.status === AssignmentStatus.PENDING),
      completed: filtered.filter(
        (a) => a.status === AssignmentStatus.COMPLETED
      ),
      graded: filtered.filter((a) => a.status === AssignmentStatus.GRADED),
      failed: filtered.filter((a) => a.status === AssignmentStatus.FAILED),
    };

    // Sort pending by soonest deadline, others by most recent assignment
    grouped.pending.sort(
      (a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
    );
    grouped.completed.sort(
      (a, b) =>
        new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime()
    );
    grouped.graded.sort(
      (a, b) =>
        new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime()
    );
    grouped.failed.sort(
      (a, b) =>
        new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime()
    );

    return [
      ...grouped.pending,
      ...grouped.completed,
      ...grouped.graded,
      ...grouped.failed,
    ];
  }, [assignments, searchTerm]);

  let lastWeek: number | null = null;

  return (
    <>
      <div className="mb-6">
        <Input
          type="search"
          placeholder="Search lessons..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        {groupedAndSortedAssignments.length > 0 ? (
          groupedAndSortedAssignments.map((assignment, index) => {
            const week = parseInt(
              getWeekAndDay(assignment.assignedAt).split('-')[0],
              10
            );
            const showDivider = week !== lastWeek;
            lastWeek = week;
            return (
              <div key={assignment.id}>
                {showDivider && <WeekDivider weekNumber={week} />}
                {/* No type error here now */}
                <StudentLessonCard assignment={assignment} index={index} />
              </div>
            );
          })
        ) : (
          <div className="rounded-lg border bg-white py-12 px-6 text-center">
            <h3 className="text-lg font-semibold">No Lessons Found</h3>
            <p className="mt-1 text-gray-600">
              You have not been assigned any lessons yet, or none match your
              search criteria.
            </p>
          </div>
        )}
      </div>
    </>
  );
}