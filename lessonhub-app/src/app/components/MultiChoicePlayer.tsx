// file: src/app/components/MultiChoicePlayer.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Assignment, AssignmentStatus, Lesson, MultiChoiceQuestion as PrismaQuestion, MultiChoiceOption as PrismaOption } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';

// ✅ DEFINE A CORRECT TYPE for the nested relations
type AssignmentWithMultiChoice = Assignment & {
  lesson: Lesson & {
    multiChoiceQuestions: (PrismaQuestion & {
      options: PrismaOption[];
    })[];
  };
};

interface MultiChoicePlayerProps {
  assignment: AssignmentWithMultiChoice;
}

export default function MultiChoicePlayer({ assignment }: MultiChoicePlayerProps) {
  const router = useRouter();
  // ✅ ACCESS THE CORRECT PROPERTY
  const questions = assignment.lesson.multiChoiceQuestions;
  
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [studentNotes, setStudentNotes] = useState(assignment.studentNotes || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPastDeadline = new Date() > new Date(assignment.deadline);
  const isReadOnly = assignment.status === AssignmentStatus.GRADED || assignment.status === AssignmentStatus.FAILED;

  const handleAnswerSelect = (questionId: string, optionId: string) => {
    setSelectedAnswers(prev => ({
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
      const response = await fetch(`/api/assignments/${assignment.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: selectedAnswers, studentNotes }),
      });

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
    if (isReadOnly) return 'Submission Closed';
    if (isPastDeadline) return 'Deadline Passed';
    return 'Submit Response';
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-8">
        {questions.map((question, qIndex) => (
          <div key={question.id} className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-md border shadow-sm">
              <Label className="font-bold text-base">
                Q{qIndex + 1}❓ {question.question}
              </Label>
            </div>
            <RadioGroup
              onValueChange={(value) => handleAnswerSelect(question.id, value)}
              disabled={isLoading || isPastDeadline || isReadOnly}
              className="ml-2 space-y-2"
            >
              {question.options.map((option) => (
                <div key={option.id} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.id} id={`${question.id}-${option.id}`} />
                  <Label htmlFor={`${question.id}-${option.id}`}>{option.text}</Label>
                </div>
              ))}
            </RadioGroup>
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