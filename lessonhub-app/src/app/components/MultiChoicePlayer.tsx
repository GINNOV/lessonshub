// file: src/app/components/MultiChoicePlayer.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Assignment, Lesson, MultiChoiceQuestion as PrismaQuestion, MultiChoiceOption } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { saveMultiChoiceAssignmentDraft, submitMultiChoiceAssignment } from '@/actions/lessonActions';
import { toast } from 'sonner';
import { RotateCw, Check } from 'lucide-react';
import Rating from './Rating';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';

type SerializableLesson = Omit<Lesson, 'price'> & {
  price: number;
  multiChoiceQuestions: (PrismaQuestion & { options: MultiChoiceOption[] })[];
};

type MultiChoiceAssignment = Omit<Assignment, 'lesson'> & {
  lesson: SerializableLesson;
  draftAnswers?: unknown;
  draftRating?: number | null;
  draftUpdatedAt?: string | Date | null;
};

interface MultiChoicePlayerProps {
  assignment: MultiChoiceAssignment;
  isSubmissionLocked?: boolean;
  mode?: 'assignment' | 'practice';
  practiceExitHref?: string;
}

export default function MultiChoicePlayer({
  assignment,
  isSubmissionLocked = false,
  mode = 'assignment',
  practiceExitHref,
}: MultiChoicePlayerProps) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rating, setRating] = useState<number>(assignment.draftRating ?? 0);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(() => {
    if (!assignment.draftUpdatedAt) return null;
    return new Date(assignment.draftUpdatedAt);
  });
  const { multiChoiceQuestions } = assignment.lesson;
  const isPractice = mode === 'practice';
  const isPending = assignment.status === 'PENDING';

  const draftAnswers = useMemo(() => {
    if (!assignment.draftAnswers || typeof assignment.draftAnswers !== 'object') return null;
    try {
      return assignment.draftAnswers as Record<string, string>;
    } catch {
      return null;
    }
  }, [assignment.draftAnswers]);

  useEffect(() => {
    if (!isPractice && isPending) {
      if (draftAnswers) {
        setAnswers({ ...draftAnswers });
      }
      setRating(assignment.draftRating ?? 0);
    }
  }, [assignment.draftRating, draftAnswers, isPending, isPractice]);

  const handleValueChange = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    if (isPractice) {
      if (Object.keys(answers).length !== multiChoiceQuestions.length) {
        toast.error('Answer every question to see your practice results.');
        return;
      }
      setShowResults(true);
      return;
    }
    if (isSubmissionLocked) {
      toast.error('The deadline has passed. Submissions are disabled for this lesson.');
      return;
    }
    if (Object.keys(answers).length !== multiChoiceQuestions.length) {
      toast.error('Please answer all questions before submitting.');
      return;
    }
    setIsSubmitting(true);
    const result = await submitMultiChoiceAssignment(
      assignment.id,
      assignment.studentId,
      answers,
      rating > 0 ? rating : undefined
    );

    if (result.success) {
      toast.success('Your assignment has been submitted and graded!');
      setShowResults(true);
    } else {
      toast.error(result.error || 'There was an error submitting your assignment.');
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    if (isPractice || !isPending || isSubmissionLocked) return;
    setIsSavingDraft(true);
    const result = await saveMultiChoiceAssignmentDraft(assignment.id, assignment.studentId, {
      answers,
      rating: rating > 0 ? rating : undefined,
    });
    setIsSavingDraft(false);
    if (result.success) {
      const now = new Date();
      setLastSavedAt(now);
      toast.success('Draft saved. Finish whenever you’re ready.');
      router.refresh();
    } else {
      toast.error(result.error || 'Unable to save draft right now.');
    }
  };

  const handleRestart = () => {
    setAnswers({});
    setShowResults(false);
    setIsSubmitting(false);
    setRating(0);
  };

  const handlePracticeFinish = () => {
    if (practiceExitHref) {
      router.push(practiceExitHref);
      return;
    }
    router.refresh();
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
          {isPractice ? (
            <Button onClick={handlePracticeFinish}>
              <Check className="mr-2 h-4 w-4" /> Done practicing
            </Button>
          ) : (
            <Button onClick={() => router.push('/my-lessons')} >
                Finish
            </Button>
          )}
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
      {!isPractice && (
        <div className="mt-6 border-t pt-6">
          <h3 className="text-lg font-semibold mb-2 text-center">Rate this lesson</h3>
          <div className="flex justify-center">
            <Rating
              initialRating={rating}
              onRatingChange={setRating}
              disabled={isSubmissionLocked}
            />
          </div>
        </div>
      )}
      {!isPractice && isPending && (
        <div className="flex flex-col gap-3 md:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={handleSaveDraft}
            disabled={isSavingDraft || isSubmissionLocked}
            className="w-full md:w-48"
          >
            {isSavingDraft ? 'Saving draft...' : 'Save Draft'}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || isSubmissionLocked}
            className="w-full md:flex-1"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Answers'}
          </Button>
        </div>
      )}
      {(!isPractice && isPending) && (
        <p className="text-sm text-gray-500">
          {lastSavedAt
            ? `Last saved ${formatDistanceToNow(lastSavedAt, { addSuffix: true })}`
            : 'Draft not saved yet'}
        </p>
      )}
      {(isPractice || !isPending) && (
        <Button
          onClick={handleSubmit}
          disabled={!isPractice ? (isSubmitting || isSubmissionLocked) : false}
          className="w-full"
        >
          {isPractice ? 'Check results' : isSubmitting ? 'Submitting...' : 'Submit Answers'}
        </Button>
      )}
    </div>
  );
}
