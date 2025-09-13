// file: lessonhub-app/src/app/components/LessonResponseForm.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Assignment, AssignmentStatus, Lesson } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface LessonResponseFormProps {
  assignment: Assignment & { lesson: Lesson };
}

export default function LessonResponseForm({ assignment }: LessonResponseFormProps) {
  const router = useRouter();
  const [answers, setAnswers] = useState<string[]>(
    (assignment.answers as string[] | null) || Array((assignment.lesson.questions as string[])?.length || 0).fill('')
  );
  const [studentNotes, setStudentNotes] = useState(assignment.studentNotes || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPastDeadline = new Date() > new Date(assignment.deadline);
  const isReadOnly = assignment.status !== AssignmentStatus.PENDING;


  const handleAnswerChange = (index: number, value: string) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (answers.every(answer => answer.trim() === '')) {
      setError('You must answer at least one question to submit.');
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/assignments/${assignment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, studentNotes }),
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to submit response');
        } else {
            // Handle non-JSON responses (like HTML redirect pages)
            throw new Error(`An unexpected error occurred. Please try signing in again. (Status: ${response.status})`);
        }
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
    if (isReadOnly) return 'Submission Closed';
    if (isPastDeadline) return 'Deadline Passed';
    return 'Submit Response';
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-6">
        {(assignment.lesson.questions as string[])?.map((question, index) => (
          <div key={index} className="space-y-3">
            <div className="p-3 bg-gray-50 rounded-md border shadow-sm">
                <Label htmlFor={`question-${index}`} className="font-bold text-base">
                    Q{index + 1}❓ {question}
                </Label>
            </div>
            <Textarea
              id={`question-${index}`}
              value={answers[index]}
              onChange={(e) => handleAnswerChange(index, e.target.value)}
              disabled={isLoading || isPastDeadline || isReadOnly}
              className="min-h-[100px] ml-2"
            />
          </div>
        ))}
      </div>
      
      <div className="mt-6 space-y-2 border-t pt-6">
        <Label htmlFor="student-notes">Student Notes (Optional)</Label>
        <Textarea
          id="student-notes"
          value={studentNotes}
          onChange={(e) => setStudentNotes(e.target.value)}
          disabled={isLoading || isPastDeadline || isReadOnly}
          placeholder="Add any notes for your teacher here..."
        />
      </div>

      {error && <p className="text-red-500 bg-red-100 p-3 rounded-md mt-4">{error}</p>}

      <Button
        type="submit"
        disabled={isLoading || isPastDeadline || isReadOnly}
        className="mt-4"
      >
        {getButtonText()}
      </Button>
    </form>
  );
}