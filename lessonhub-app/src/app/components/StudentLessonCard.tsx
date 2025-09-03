// file: src/app/components/StudentLessonCard.tsx

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Assignment, Lesson, User, AssignmentStatus } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { cn, getWeekAndDay } from '@/lib/utils';

type AssignmentWithDetails = Assignment & {
  lesson: Lesson & {
    teacher: User;
  };
};

interface StudentLessonCardProps {
  assignment: AssignmentWithDetails;
}

const statusStyles = {
  [AssignmentStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
  [AssignmentStatus.COMPLETED]: 'bg-blue-100 text-blue-800',
  [AssignmentStatus.GRADED]: 'bg-green-100 text-green-800',
  [AssignmentStatus.FAILED]: 'bg-red-100 text-red-800',
  PAST_DUE: 'bg-red-100 text-red-800',
};

export default function StudentLessonCard({ assignment }: StudentLessonCardProps) {
  const isPastDeadline = new Date() > new Date(assignment.deadline);
  const status = isPastDeadline && assignment.status === "PENDING" ? "PAST_DUE" : assignment.status;

  return (
    <div className="p-4 sm:p-6 border rounded-lg shadow-sm bg-white">
      <div className="flex flex-col sm:flex-row gap-6">
        {assignment.lesson.assignment_image_url && (
          <div className="flex-shrink-0 w-full sm:w-auto">
            <Image
              src={assignment.lesson.assignment_image_url}
              alt={`Image for ${assignment.lesson.title}`}
              width={150}
              height={100}
              className="rounded-md object-cover w-full h-auto sm:w-[150px] sm:h-[100px]"
            />
          </div>
        )}
        <div className="flex-grow">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h2 className="text-xl font-semibold">{assignment.lesson.title}</h2>
              <p className="text-xs text-gray-400 mt-1">
                Lesson {getWeekAndDay(assignment.lesson.createdAt)} - Assigned by: {assignment.lesson.teacher.name}
              </p>
            </div>
            <span className={cn('px-3 py-1 text-xs font-medium rounded-full', statusStyles[status as keyof typeof statusStyles])}>
              {status}
            </span>
          </div>

          {assignment.lesson.lesson_preview && (
            <p className="text-sm text-gray-600 mt-2 p-3 bg-gray-50 rounded-md border">{assignment.lesson.lesson_preview}</p>
          )}

          {assignment.status === 'GRADED' && (
            <div className="mt-4 p-3 bg-green-50 rounded-md border border-green-200">
              <h3 className="font-semibold text-green-800">Grade and Feedback</h3>
              <p className="text-2xl font-bold mt-1 text-green-900">Score: {assignment.score}</p>
              {assignment.teacherComments && (
                <blockquote className="mt-2 pl-3 border-l-4 border-green-300 italic text-gray-700">
                  &quot;{assignment.teacherComments}&quot;
                </blockquote>
              )}
            </div>
          )}
          
          <div className="mt-4 border-t pt-4 flex justify-between items-center">
            <p className="text-sm text-gray-500">
              <strong>Deadline:</strong> {new Date(assignment.deadline).toLocaleString()}
            </p>
            {assignment.status === 'PENDING' && !isPastDeadline && (
              <Button asChild>
                <Link href={`/assignments/${assignment.id}`}>Start Lesson</Link>
              </Button>
            )}
             {assignment.status === 'GRADED' && (
              <Button variant="outline" asChild>
                <Link href={`/assignments/${assignment.id}`}>Review Results</Link>
              </Button>
            )}
             {status === 'PAST_DUE' || status === 'FAILED' && (
              <Button variant="secondary" asChild>
                <Link href={`/assignments/${assignment.id}`}>View Lesson</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}