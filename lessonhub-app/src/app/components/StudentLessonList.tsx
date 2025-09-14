// file: src/app/components/StudentLessonList.tsx

'use client';

import { useState, useMemo } from 'react';
import { Assignment, Lesson, User, AssignmentStatus } from '@prisma/client';
import { Input } from '@/components/ui/input';
import StudentLessonCard from './StudentLessonCard';
import WeekDivider from './WeekDivider';
import { getWeekAndDay } from '@/lib/utils';

// ✅ CORRECTED TYPE: The 'teacher' property is now correctly marked as optional
export type AssignmentWithDetails = Assignment & {
  lesson: Lesson & {
    teacher: User | null;
  };
};

interface StudentLessonListProps {
  assignments: AssignmentWithDetails[];
}

export default function StudentLessonList({ assignments }: StudentLessonListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const groupedAndSortedAssignments = useMemo(() => {
    const filtered = assignments.filter(a =>
      a.lesson.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.lesson.teacher?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const grouped: { [key: string]: AssignmentWithDetails[] } = {
      pending: filtered.filter(a => a.status === AssignmentStatus.PENDING),
      completed: filtered.filter(a => a.status === AssignmentStatus.COMPLETED),
      graded: filtered.filter(a => a.status === AssignmentStatus.GRADED),
      failed: filtered.filter(a => a.status === AssignmentStatus.FAILED),
    };
    
    // Sort pending by soonest deadline, others by most recent assignment
    grouped.pending.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
    grouped.completed.sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime());
    grouped.graded.sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime());
    grouped.failed.sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime());

    return [
        ...grouped.pending,
        ...grouped.completed,
        ...grouped.graded,
        ...grouped.failed
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
            const week = parseInt(getWeekAndDay(assignment.assignedAt).split('-')[0], 10);
            const showDivider = week !== lastWeek;
            lastWeek = week;
            return (
              <div key={assignment.id}>
                {showDivider && <WeekDivider weekNumber={week} />}
                <StudentLessonCard assignment={assignment} index={index} />
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 px-6 bg-white border rounded-lg">
            <h3 className="text-lg font-semibold">No Lessons Found</h3>
            <p className="text-gray-600 mt-1">You have not been assigned any lessons yet, or none match your search criteria.</p>
          </div>
        )}
      </div>
    </>
  );
}