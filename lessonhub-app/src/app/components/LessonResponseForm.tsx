// file: src/app/components/LessonResponseForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { Assignment, Lesson } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { submitStandardAssignment } from '@/actions/lessonActions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Rating from './Rating';

type SerializableLesson = Omit<Lesson, 'price'> & {
  price: number;
};

type StandardAssignment = Omit<Assignment, 'lesson'> & {
  lesson: SerializableLesson;
  answers: string[];
};

interface LessonResponseFormProps {
  assignment: StandardAssignment;
  isSubmissionLocked?: boolean;
}

export default function LessonResponseForm({ assignment, isSubmissionLocked = false }: LessonResponseFormProps) {
  const router = useRouter();
  const [answers, setAnswers] = useState<string[]>([]);
  const [studentNotes, setStudentNotes] = useState('');
  const [rating, setRating] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);

  useEffect(() => {
    if (assignment.status !== 'PENDING') {
      const studentAnswers = Array.isArray(assignment.answers) ? assignment.answers : [];
      setAnswers(studentAnswers);
      setStudentNotes(assignment.studentNotes || '');
      setRating(assignment.rating || 0);
      setIsReadOnly(true);
    } else {
      const questions = (assignment.lesson.questions as string[]) || [];
      setAnswers(Array(questions.length).fill(''));
    }
  }, [assignment]);
  
  const handleAnswerChange = (index: number, value: string) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly || isSubmissionLocked) {
      if (isSubmissionLocked) {
        toast.error("The deadline has passed. Submissions are disabled for this lesson.");
      }
      return;
    }

    const isConfirmed = window.confirm("Are you sure you want to submit your answers? You won't be able to edit them later.");
    if (!isConfirmed) {
      return;
    }

    setIsLoading(true);

    const result = await submitStandardAssignment(assignment.id, assignment.studentId, {
      answers,
      studentNotes,
      rating: rating > 0 ? rating : undefined,
    });

    if (result.success) {
      toast.success('Your assignment has been submitted successfully!');
      router.push('/my-lessons');
      router.refresh(); 
    } else {
      toast.error(result.error || 'There was an error submitting your assignment.');
    }
    setIsLoading(false);
  };
  
  const questions = (assignment.lesson.questions as string[]) || [];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {questions.map((question, index) => (
        <div key={index} className="space-y-2">
          <Label htmlFor={`question-${index}`} className="font-semibold">
            {index + 1}. {question}
          </Label>
          <Textarea
            id={`question-${index}`}
            value={answers[index] || ''}
            onChange={(e) => handleAnswerChange(index, e.target.value)}
            placeholder="Your answer..."
            required
            disabled={isLoading || isReadOnly}
            rows={4}
          />
        </div>
      ))}

      <div className="space-y-2">
        <Label htmlFor="student-notes">Notes for your teacher (optional)</Label>
        <Textarea
          id="student-notes"
          value={studentNotes}
          onChange={(e) => setStudentNotes(e.target.value)}
          placeholder="Anything you'd like to add?"
          disabled={isLoading || isReadOnly}
        />
      </div>
        
      {!isReadOnly && (
         <div className="mt-6 border-t pt-6">
            <div className="flex items-center gap-2">
                <Label>Rate this lesson:</Label>
                <Rating initialRating={rating} onRatingChange={setRating} disabled={isLoading || isReadOnly || isSubmissionLocked} />
            </div>
        </div>
      )}

      {!isReadOnly && (
        <Button type="submit" disabled={isLoading || isSubmissionLocked} className="w-full">
          {isLoading ? 'Submitting...' : 'Submit Assignment'}
        </Button>
      )}
    </form>
  );
}
