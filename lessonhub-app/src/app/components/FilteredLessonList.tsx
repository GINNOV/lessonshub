// file: src/app/components/FilteredLessonList.tsx

'use client';

import { useState, useMemo } from 'react';
import { Assignment, Lesson, User, AssignmentStatus } from '@prisma/client';
import StudentLessonList from './StudentLessonList';
import { Label } from '@/components/ui/label'; // Using the existing Label component

type AssignmentWithDetails = Assignment & {
  lesson: Lesson & {
    teacher: User;
  };
};

interface FilteredLessonListProps {
  assignments: AssignmentWithDetails[];
}

type FilterValue = "all" | "pending" | "completed" | "graded" | "failed";

export default function FilteredLessonList({ assignments }: FilteredLessonListProps) {
  const [filter, setFilter] = useState<FilterValue>("all");

  const filteredAssignments = useMemo(() => {
    if (filter === "all") {
      return assignments;
    }
    if (filter === "failed") {
      return assignments.filter(a => a.status === AssignmentStatus.GRADED && a.score === -1);
    }
    if (filter === "pending") {
        return assignments.filter(a => a.status === AssignmentStatus.PENDING);
    }
    if (filter === "completed") {
        return assignments.filter(a => a.status === AssignmentStatus.COMPLETED);
    }
    if (filter === "graded") {
        return assignments.filter(a => a.status === AssignmentStatus.GRADED && a.score !== -1);
    }
    return [];
  }, [assignments, filter]);
  
  return (
    <div>
        <div className="flex justify-end mb-4 items-center gap-2">
            <Label htmlFor="status-filter" className="font-semibold">Filter by Status:</Label>
            <select
              id="status-filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterValue)}
              className="bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="graded">Graded</option>
              <option value="failed">Failed</option>
            </select>
        </div>
        <StudentLessonList assignments={filteredAssignments} />
    </div>
  );
}