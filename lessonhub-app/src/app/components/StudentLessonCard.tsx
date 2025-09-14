// file: src/app/components/StudentLessonCard.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  Assignment,
  Lesson,
  User,
  AssignmentStatus,
  LessonType,
} from '@prisma/client';
import { Button } from '@/components/ui/button';
import { cn, getWeekAndDay } from '@/lib/utils';
import { marked } from 'marked';

// ✅ FIX: Define and export a clean, simple type for the serialized data.
// This is the single source of truth for what a student assignment looks like on the client.
export type SerializableAssignment = Assignment & {
  lesson: Omit<Lesson, 'price'> & { // Omit the original Decimal `price`
    price: number; // And replace it with a `number`
    teacher: User | null;
  };
};

interface StudentLessonCardProps {
  assignment: SerializableAssignment; // Use the new clean type
  index: number;
}

const statusStyles = {
  [AssignmentStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
  [AssignmentStatus.COMPLETED]: 'bg-blue-100 text-blue-800',
  [AssignmentStatus.GRADED]: 'bg-green-100 text-green-800',
  [AssignmentStatus.FAILED]: 'bg-red-100 text-red-800',
  PAST_DUE: 'bg-red-100 text-red-800',
};

const getGradeBackground = (score: number | null) => {
  if (score === null) return 'bg-gray-100';
  if (score === 10) return 'bg-gradient-to-br from-green-100 to-green-200';
  if (score === 2) return 'bg-gradient-to-br from-amber-100 to-amber-200';
  if (score === -1) return 'bg-gradient-to-br from-red-100 to-red-200';
  return 'bg-gradient-to-br from-yellow-100 to-yellow-200';
};

const lessonTypeImages: Record<LessonType, string> = {
  [LessonType.FLASHCARD]: '/my-lessons/flashcard.png',
  [LessonType.MULTI_CHOICE]: '/my-lessons/multiquestions.png',
  [LessonType.STANDARD]: '/my-lessons/multiquestions.png', // Default image
  [LessonType.LEARNING_SESSION]: '/my-lessons/multiquestions.png', // Default image
};

export default function StudentLessonCard({
  assignment,
  index,
}: StudentLessonCardProps) {
  const isPastDeadline = new Date() > new Date(assignment.deadline);
  const status =
    isPastDeadline && assignment.status === 'PENDING'
      ? 'PAST_DUE'
      : assignment.status;

  const commentsHtml = assignment.teacherComments
    ? marked.parse(assignment.teacherComments)
    : '';

  return (
    <div
      className={cn(
        'rounded-lg border p-4 shadow-sm sm:p-6',
        index % 2 === 0 ? 'bg-white' : 'bg-slate-50'
      )}
    >
      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="w-full flex-shrink-0 sm:w-auto">
          <Image
            src={
              assignment.lesson.assignment_image_url ||
              lessonTypeImages[assignment.lesson.type]
            }
            alt={`Image for ${assignment.lesson.title}`}
            width={150}
            height={100}
            className="h-auto w-full rounded-md object-cover sm:h-[100px] sm:w-[150px]"
            priority={index < 3}
          />
        </div>
        <div className="flex-grow">
          <div className="mb-2 flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold">
                {assignment.lesson.title}
              </h2>
              <p className="mt-1 text-xs text-gray-400">
                Lesson {getWeekAndDay(assignment.lesson.createdAt)} - Assigned
                by:{' '}
                {assignment.lesson.teacher?.name || (
                  <span className="italic">Unassigned</span>
                )}
              </p>
            </div>
            <span
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium',
                statusStyles[status as keyof typeof statusStyles]
              )}
            >
              {status}
            </span>
          </div>

          {assignment.lesson.lesson_preview && (
            <p className="mt-2 rounded-md border bg-gray-50 p-3 text-sm text-gray-600">
              {assignment.lesson.lesson_preview}
            </p>
          )}

          {assignment.status === 'GRADED' && (
            <div
              className={cn(
                'mt-4 rounded-md border p-3',
                getGradeBackground(assignment.score)
              )}
            >
              <h3 className="font-semibold">Grade and Feedback</h3>
              <div className="mt-2 flex items-start gap-4">
                <div className="flex-shrink-0 rounded-md border bg-white/50 p-2 text-center">
                  <p className="text-2xl font-bold">{assignment.score}</p>
                  <p className="text-xs">Score</p>
                </div>
                {assignment.teacherComments && (
                  <div
                    className="prose prose-sm flex-grow"
                    dangerouslySetInnerHTML={{ __html: commentsHtml as string }}
                  />
                )}
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between border-t pt-4">
            <p className="text-sm text-gray-500">
              <strong>Deadline:</strong>{' '}
              {new Date(assignment.deadline).toLocaleString()}
            </p>
            {assignment.status === 'PENDING' && !isPastDeadline && (
              <Button asChild>
                <Link href={`/assignments/${assignment.id}`}>Start Lesson</Link>
              </Button>
            )}
            {assignment.status === 'GRADED' && (
              <Button variant="outline" asChild>
                <Link href={`/assignments/${assignment.id}`}>
                  Review Results
                </Link>
              </Button>
            )}
            {(status === 'PAST_DUE' || status === 'FAILED') && (
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