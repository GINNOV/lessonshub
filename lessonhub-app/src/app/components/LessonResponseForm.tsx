// file: src/app/components/LessonResponseForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Assignment, AssignmentStatus, Lesson } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import Rating from './Rating'; // Import the new rating component

interface LessonResponseFormProps {
  assignment: Assignment & {
    lesson: Omit<Lesson, 'price'> & {
      price: number;
    };
  };
}

export default function LessonResponseForm({
  assignment,
}: LessonResponseFormProps) {
  const router = useRouter();

  const lessonQuestions = (assignment.lesson.questions as string[]) || [];

  const [answers, setAnswers] = useState<string[]>(() => {
    if (assignment.answers && Array.isArray(assignment.answers)) {
      return assignment.answers;
    }
    return Array(lessonQuestions.length).fill('');
  });

  const [studentNotes, setStudentNotes] = useState(
    assignment.studentNotes || ''
  );
  const [rating, setRating] = useState(assignment.rating || 0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPastDeadline = new Date() > new Date(assignment.deadline);
  const isReadOnly =
    assignment.status !== AssignmentStatus.PENDING || isPastDeadline;

  const handleAnswerChange = (index: number, value: string) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (answers.every((answer) => answer.trim() === '')) {
      setError('You must answer at least one question to submit.');
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/assignments/${assignment.id}/submit`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers, studentNotes, rating }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit response');
      }

      router.push('/my-lessons');
      router.refresh();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonText = () => {
    if (isLoading) return 'Submitting...';
    if (assignment.status !== 'PENDING') return 'Submission Closed';
    if (isPastDeadline) return 'Deadline Passed';
    return 'Submit Response';
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-6">
        {lessonQuestions.map((question, index) => (
          <div key={index} className="space-y-3">
            <div className="rounded-md border bg-gray-50 p-3 shadow-sm">
              <Label
                htmlFor={`question-${index}`}
                className="text-base font-bold"
              >
                Q{index + 1}❓ {question}
              </Label>
            </div>
            <Textarea
              id={`question-${index}`}
              value={answers[index]}
              onChange={(e) => handleAnswerChange(index, e.target.value)}
              disabled={isLoading || isReadOnly}
              className="ml-2 min-h-[100px]"
            />
          </div>
        ))}
      </div>

      <div className="mt-6 space-y-2 border-t pt-6">
        <Label htmlFor="student-notes" className="font-bold uppercase">STUDENT NOTES</Label>
        <Textarea
          id="student-notes"
          value={studentNotes}
          onChange={(e) => setStudentNotes(e.target.value)}
          disabled={isLoading || isReadOnly}
          placeholder="Add any notes for your teacher here..."
        />
      </div>

      {error && (
        <p className="mt-4 rounded-md bg-red-100 p-3 text-red-500">{error}</p>
      )}

      {assignment.status === 'PENDING' && (
        <div className="flex items-center gap-4 mt-4">
            <Button
                type="submit"
                disabled={isLoading || isReadOnly}
            >
                {getButtonText()}
            </Button>
            <div className="flex items-center gap-2">
                <Label>Rate this lesson:</Label>
                <Rating value={rating} onChange={setRating} disabled={isLoading || isReadOnly} />
            </div>
        </div>
      )}
    </form>
  );
}