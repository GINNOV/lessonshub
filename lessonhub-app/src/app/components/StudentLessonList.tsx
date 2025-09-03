// file: src/app/components/StudentLessonList.tsx

'use client';

import { useState, useMemo } from 'react';
import { Assignment, Lesson, User, AssignmentStatus } from '@prisma/client';
import { Input } from '@/components/ui/input';
import StudentLessonCard from './StudentLessonCard';
import WeekDivider from './WeekDivider';
import { getWeekAndDay } from '@/lib/utils';

type AssignmentWithDetails = Assignment & {
  lesson: Lesson & {
    teacher: User;
  };
};

interface StudentLessonListProps {
  assignments: AssignmentWithDetails[];
}

const statusOrder = {
  [AssignmentStatus.PENDING]: 1,
  [AssignmentStatus.COMPLETED]: 2,
  [AssignmentStatus.GRADED]: 3,
  [AssignmentStatus.FAILED]: 4,
};

export default function StudentLessonList({ assignments }: StudentLessonListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const sortedAndFilteredAssignments = useMemo(() => {
    const now = new Date();
    return assignments
      .map(a => ({
        ...a,
        week: parseInt(getWeekAndDay(a.assignedAt).split('-')[0], 10),
      }))
      .filter(a => a.lesson.title.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => {
        const isPastDueA = now > new Date(a.deadline) && a.status === AssignmentStatus.PENDING;
        const isPastDueB = now > new Date(b.deadline) && b.status === AssignmentStatus.PENDING;
        
        const statusA = isPastDueA ? 0 : statusOrder[a.status];
        const statusB = isPastDueB ? 0 : statusOrder[b.status];

        if (a.week !== b.week) {
          return b.week - a.week; // Sort by week descending
        }
        if (statusA !== statusB) {
          return statusA - statusB; // Sort by status
        }
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime(); // Then by deadline
      });
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
        {sortedAndFilteredAssignments.length > 0 ? (
          sortedAndFilteredAssignments.map((assignment, index) => {
            const showDivider = assignment.week !== lastWeek;
            lastWeek = assignment.week;
            return (
              <div key={assignment.id}>
                {showDivider && <WeekDivider weekNumber={assignment.week} />}
                <StudentLessonCard assignment={assignment} index={index} />
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 px-6 bg-white border rounded-lg">
            <h3 className="text-lg font-semibold">No Lessons Found</h3>
            <p className="text-gray-600 mt-1">No lessons match your search criteria.</p>
          </div>
        )}
      </div>
    </>
  );
}