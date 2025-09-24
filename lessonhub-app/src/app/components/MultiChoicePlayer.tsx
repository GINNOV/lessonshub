// file: src/app/components/MultiChoicePlayer.tsx
'use client';

import { useState } from 'react';
import { Assignment, Lesson, MultiChoiceQuestion as PrismaQuestion, MultiChoiceOption } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { submitMultiChoiceAssignment } from '@/actions/lessonActions';
import { toast } from 'sonner';
import { RotateCw } from 'lucide-react';
import Rating from './Rating';
import { useRouter } from 'next/navigation';

type SerializableLesson = Omit<Lesson, 'price'> & {
  price: number;
  multiChoiceQuestions: (PrismaQuestion & { options: MultiChoiceOption[] })[];
};

type MultiChoiceAssignment = Omit<Assignment, 'lesson'> & {
  lesson: SerializableLesson;
};

interface MultiChoicePlayerProps {
  assignment: MultiChoiceAssignment;
}

export default function MultiChoicePlayer({ assignment }: MultiChoicePlayerProps) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rating, setRating] = useState<number | undefined>(undefined);
  const { multiChoiceQuestions } = assignment.lesson;

  const handleValueChange = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length !== multiChoiceQuestions.length) {
      toast.error('Please answer all questions before submitting.');
      return;
    }
    setIsSubmitting(true);
    const result = await submitMultiChoiceAssignment(assignment.id, assignment.studentId, answers, rating);

    if (result.success) {
      toast.success('Your assignment has been submitted and graded!');
      setShowResults(true);
    } else {
      toast.error(result.error || 'There was an error submitting your assignment.');
      setIsSubmitting(false);
    }
  };

  const handleRestart = () => {
    setAnswers({});
    setShowResults(false);
    setIsSubmitting(false);
    setRating(undefined);
  };
  
  if (showResults) {
    let correctCount = 0;
    multiChoiceQuestions.forEach(q => {
      const correctOption = q.options.find(o => o.isCorrect);
      if (answers[q.id] === correctOption?.id) {
        correctCount++;
      }
    });

    return (
      <div className="text-center p-8 border rounded-lg">
        <h2 className="text-2xl font-bold mb-4">Results</h2>
        <p className="text-green-600 font-semibold">
          You answered {correctCount} out of {multiChoiceQuestions.length} questions correctly.
        </p>
        <div className="flex justify-center gap-4 mt-6">
          <Button onClick={handleRestart} variant="outline">
              <RotateCw className="mr-2 h-4 w-4" /> Try Again
          </Button>
           <Button onClick={() => router.push('/my-lessons')} >
              Finish
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {multiChoiceQuestions.map((question, index) => (
        <div key={question.id} className="p-4 border rounded-lg">
          <p className="font-semibold">{index + 1}. {question.question}</p>
          <RadioGroup 
            onValueChange={(value) => handleValueChange(question.id, value)} 
            className="mt-4 space-y-2"
            value={answers[question.id]}
          >
            {question.options.map(option => (
              <div key={option.id} className="flex items-center space-x-2">
                <RadioGroupItem value={option.id} id={`${question.id}-${option.id}`} />
                <Label htmlFor={`${question.id}-${option.id}`}>{option.text}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      ))}
       <div className="mt-6 border-t pt-6">
          <h3 className="text-lg font-semibold mb-2 text-center">Rate this lesson</h3>
          <div className="flex justify-center">
            <Rating onRatingChange={setRating} />
          </div>
      </div>
      <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Submitting...' : 'Submit Answers'}
      </Button>
    </div>
  );
}