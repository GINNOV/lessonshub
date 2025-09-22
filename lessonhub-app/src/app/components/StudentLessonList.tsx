// file: src/app/components/StudentLessonList.tsx
'use client';

import { useState, useMemo } from 'react';
import { Assignment, Lesson, User, AssignmentStatus } from '@prisma/client';
import StudentLessonCard from './StudentLessonCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getWeekAndDay } from '@/lib/utils';
import WeekDivider from './WeekDivider';

type SerializableUser = Omit<User, 'defaultLessonPrice'> & {
  defaultLessonPrice: number | null;
};

type SerializableAssignment = Omit<Assignment, 'answers' | 'lesson'> & {
  answers: any;
  lesson: Omit<Lesson, 'price' | 'teacher' | '_count'> & {
    price: number;
    teacher: SerializableUser | null;
    completionCount: number;
  };
};

interface StudentLessonListProps {
  assignments: SerializableAssignment[];
}

export default function StudentLessonList({ assignments }: StudentLessonListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' or 'due'

  const filteredAssignments = useMemo(() => {
    const now = new Date();
    return assignments
      .map(assignment => ({
          ...assignment,
          // Calculate week based on deadline for correct grouping
          week: parseInt(getWeekAndDay(new Date(assignment.deadline)).split('-')[0], 10),
      }))
      .filter((assignment) => {
        if (filter === 'due') {
          return assignment.status === AssignmentStatus.PENDING && new Date(assignment.deadline) >= now;
        }
        return true;
      })
      .filter((assignment) =>
        assignment.lesson.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assignment.lesson.teacher?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [assignments, searchTerm, filter]);

  let lastWeek: number | null = null;

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <Input
          type="search"
          placeholder="Search by lesson or teacher..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex items-center gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
          >
            All Lessons
          </Button>
          <Button
            variant={filter === 'due' ? 'default' : 'outline'}
            onClick={() => setFilter('due')}
          >
            Due Lessons
          </Button>
        </div>
      </div>
      
      {filteredAssignments.length > 0 ? (
        <div className="space-y-6">
          {filteredAssignments.map((assignment, index) => {
            const showDivider = assignment.week !== lastWeek;
            lastWeek = assignment.week;
            return (
                <div key={assignment.id}>
                    {showDivider && <WeekDivider weekNumber={assignment.week} />}
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                        <StudentLessonCard assignment={assignment} index={index} />
                    </div>
                </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold">No lessons found</h3>
          <p className="text-gray-500 mt-2">
            {filter === 'due' 
              ? "You have no upcoming deadlines. Great job!" 
              : "Try adjusting your search or filter."
            }
          </p>
        </div>
      )}
    </div>
  );
}

