// file: src/app/components/MultiChoicePlayer.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Assignment, AssignmentStatus, Lesson } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';

// Define a type for an individual answer object
type Answer = {
  id: string;
  text: string;
};

// Define a type for the complex question format
type MultiChoiceQuestion = {
  id: string;
  text: string;
  answers: Answer[]; // Changed from string[] to Answer[]
  correctAnswerId: number;
};

interface MultiChoicePlayerProps {
  assignment: Assignment & { lesson: Lesson };
}

export default function MultiChoicePlayer({ assignment }: MultiChoicePlayerProps) {
  const router = useRouter();
  const questions = assignment.lesson.questions as MultiChoiceQuestion[];
  
  // State to hold the index of the selected answer for each question
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>(
    Array(questions.length).fill(null)
  );
  const [studentNotes, setStudentNotes] = useState(assignment.studentNotes || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPastDeadline = new Date() > new Date(assignment.deadline);
  const isReadOnly = assignment.status === AssignmentStatus.GRADED || assignment.status === AssignmentStatus.FAILED;

  const handleAnswerSelect = (questionIndex: number, answerIndex: number) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[questionIndex] = answerIndex;
    setSelectedAnswers(newAnswers);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAnswers.some(answer => answer === null)) {
      setError('Please answer all questions before submitting.');
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/assignments/${assignment.id}`, {
        method: 'PATCH',
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
                Q{qIndex + 1}❓ {question.text}
              </Label>
            </div>
            <RadioGroup
              onValueChange={(value) => handleAnswerSelect(qIndex, parseInt(value))}
              disabled={isLoading || isPastDeadline || isReadOnly}
              className="ml-2 space-y-2"
            >
              {question.answers.map((answer, aIndex) => (
                <div key={aIndex} className="flex items-center space-x-2">
                  <RadioGroupItem value={aIndex.toString()} id={`${question.id}-${aIndex}`} />
                  <Label htmlFor={`${question.id}-${aIndex}`}>{answer.text}</Label>
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