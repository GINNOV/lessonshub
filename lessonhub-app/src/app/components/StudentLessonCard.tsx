// file: src/app/components/StudentLessonCard.tsx
'use client';

import Link from 'next/link';
import { Assignment, Lesson, User, AssignmentStatus } from '@prisma/client';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// ✅ CORRECTED TYPE: The 'teacher' property is now correctly marked as optional
type AssignmentWithDetails = Assignment & {
  lesson: Lesson & {
    teacher: User | null;
  };
};

interface StudentLessonCardProps {
  assignment: AssignmentWithDetails;
  index: number;
}

const statusStyles: Record<AssignmentStatus, string> = {
  [AssignmentStatus.PENDING]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  [AssignmentStatus.COMPLETED]: 'bg-blue-100 text-blue-800 border-blue-200',
  [AssignmentStatus.GRADED]: 'bg-green-100 text-green-800 border-green-200',
  [AssignmentStatus.FAILED]: 'bg-red-100 text-red-800 border-red-200',
};

export default function StudentLessonCard({ assignment, index }: StudentLessonCardProps) {
  const isPastDeadline = new Date() > new Date(assignment.deadline);
  
  return (
    <Card className={`transition-all hover:shadow-md ${index > 0 ? 'mt-4' : ''}`}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-semibold">{assignment.lesson.title}</CardTitle>
          <Badge className={statusStyles[assignment.status]}>{assignment.status}</Badge>
        </div>
        <div className="text-xs text-gray-500 flex items-center space-x-2">
          {/* ✅ CORRECTED RENDERING: Safely access teacher's name or display 'Unassigned' */}
          <span>by {assignment.lesson.teacher?.name || <span className="italic">Unassigned</span>}</span>
          <span>&bull;</span>
          <span>Due: {new Date(assignment.deadline).toLocaleDateString()}</span>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 line-clamp-2">
          {assignment.lesson.lesson_preview || 'No preview available.'}
        </p>
      </CardContent>
      <CardFooter className="flex justify-between items-center">
        <div>
          {assignment.status === AssignmentStatus.GRADED && assignment.score !== null && (
            <p className="text-sm font-semibold">Score: {assignment.score}</p>
          )}
          {isPastDeadline && assignment.status === AssignmentStatus.PENDING && (
             <p className="text-sm font-semibold text-red-600">Past Due</p>
          )}
        </div>
        <Button asChild>
          <Link href={`/assignments/${assignment.id}`}>
            {assignment.status === AssignmentStatus.PENDING ? 'Start Lesson' : 'View Lesson'}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}