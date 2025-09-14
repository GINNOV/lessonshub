// file: src/app/components/MultiChoicePlayer.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Assignment,
  AssignmentStatus,
  Lesson,
  MultiChoiceQuestion as PrismaQuestion,
  MultiChoiceOption as PrismaOption,
} from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';

type MultiChoiceAnswer = {
  questionId: string;
  selectedAnswerId: string;
  isCorrect: boolean;
};

type AssignmentWithMultiChoice = Assignment & {
  lesson: Omit<Lesson, 'price'> & {
    price: number;
    multiChoiceQuestions: (PrismaQuestion & {
      options: PrismaOption[];
    })[];
  };
};

interface MultiChoicePlayerProps {
  assignment: AssignmentWithMultiChoice;
}

export default function MultiChoicePlayer({
  assignment,
}: MultiChoicePlayerProps) {
  const router = useRouter();
  const questions = assignment.lesson.multiChoiceQuestions;

  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, string>
  >(() => {
    if (
      assignment.status !== 'PENDING' &&
      assignment.answers &&
      Array.isArray(assignment.answers)
    ) {
      return (assignment.answers as MultiChoiceAnswer[]).reduce(
        (acc, answer) => {
          acc[answer.questionId] = answer.selectedAnswerId;
          return acc;
        },
        {} as Record<string, string>
      );
    }
    return {};
  });

  const [studentNotes, setStudentNotes] = useState(
    assignment.studentNotes || ''
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPastDeadline = new Date() > new Date(assignment.deadline);
  const isReadOnly =
    assignment.status !== AssignmentStatus.PENDING || isPastDeadline;

  const handleAnswerSelect = (questionId: string, optionId: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.keys(selectedAnswers).length < questions.length) {
      setError('Please answer all questions before submitting.');
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
          body: JSON.stringify({ answers: selectedAnswers, studentNotes }),
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

  // ✅ FIX: This function's logic is now guaranteed to always return a string,
  // which satisfies React's requirement for a valid renderable child (ReactNode).
  const getButtonText = (): string => {
    if (isLoading) return 'Submitting...';
    if (assignment.status !== 'PENDING') return 'Submission Closed';
    if (isPastDeadline) return 'Deadline Passed';
    return 'Submit Response';
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-8">
        {questions.map((question, qIndex) => (
          <div key={question.id} className="space-y-4">
            <div className="rounded-md border bg-gray-50 p-3 shadow-sm">
              <Label className="text-base font-bold">
                Q{qIndex + 1}❓ {question.question}
              </Label>
            </div>
            <RadioGroup
              value={selectedAnswers[question.id]}
              onValueChange={(value) => handleAnswerSelect(question.id, value)}
              disabled={isLoading || isReadOnly}
              className="ml-2 space-y-2"
            >
              {question.options.map((option) => (
                <div key={option.id} className="flex items-center space-x-2">
                  <RadioGroupItem
                    value={option.id}
                    id={`${question.id}-${option.id}`}
                  />
                  <Label htmlFor={`${question.id}-${option.id}`}>
                    {option.text}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        ))}
      </div>

      <div className="mt-6 space-y-2 border-t pt-6">
        <Label htmlFor="student-notes">Student Notes</Label>
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
        <Button
          type="submit"
          disabled={isLoading || isReadOnly}
          className="mt-4"
        >
          {getButtonText()}
        </Button>
      )}
    </form>
  );
}