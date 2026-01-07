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
  copy?: MultiChoiceCopy;
}

type MultiChoiceCopy = {
  practiceAnswerAll: string;
  deadlinePassed: string;
  submitAnswerAll: string;
  submitSuccess: string;
  submitError: string;
  draftSaved: string;
  draftError: string;
  resultsTitle: string;
  resultsSummary: string;
  tryAgain: string;
  donePracticing: string;
  finish: string;
  rateLesson: string;
  saveDraft: string;
  savingDraft: string;
  submitAnswers: string;
  submitting: string;
  lastSaved: string;
  draftNotSaved: string;
  checkResults: string;
};

const defaultCopy: MultiChoiceCopy = {
  practiceAnswerAll: 'Answer every question to see your practice results.',
  deadlinePassed: 'The deadline has passed. Submissions are disabled for this lesson.',
  submitAnswerAll: 'Please answer all questions before submitting.',
  submitSuccess: 'Your assignment has been submitted and graded!',
  submitError: 'There was an error submitting your assignment.',
  draftSaved: 'Draft saved. Finish whenever you’re ready.',
  draftError: 'Unable to save draft right now.',
  resultsTitle: 'Results',
  resultsSummary: 'You answered {correct} out of {total} questions correctly.',
  tryAgain: 'Try Again',
  donePracticing: 'Done practicing',
  finish: 'Finish',
  rateLesson: 'Rate this lesson',
  saveDraft: 'Save Draft',
  savingDraft: 'Saving draft...',
  submitAnswers: 'Submit Answers',
  submitting: 'Submitting...',
  lastSaved: 'Last saved {time}',
  draftNotSaved: 'Draft not saved yet',
  checkResults: 'Check results',
};

export default function MultiChoicePlayer({
  assignment,
  isSubmissionLocked = false,
  mode = 'assignment',
  practiceExitHref,
  copy,
}: MultiChoicePlayerProps) {
  const t = copy ?? defaultCopy;
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
        toast.error(t.practiceAnswerAll);
        return;
      }
      setShowResults(true);
      return;
    }
    if (isSubmissionLocked) {
      toast.error(t.deadlinePassed);
      return;
    }
    if (Object.keys(answers).length !== multiChoiceQuestions.length) {
      toast.error(t.submitAnswerAll);
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
      toast.success(t.submitSuccess);
      setShowResults(true);
    } else {
      toast.error(result.error || t.submitError);
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
      toast.success(t.draftSaved);
      router.refresh();
    } else {
      toast.error(result.error || t.draftError);
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
        <h2 className="text-2xl font-bold mb-4">{t.resultsTitle}</h2>
        <p className="text-green-600 font-semibold">
          {t.resultsSummary
            .replace('{correct}', correctCount.toString())
            .replace('{total}', multiChoiceQuestions.length.toString())}
        </p>
        <div className="flex justify-center gap-4 mt-6">
          <Button onClick={handleRestart} variant="outline">
              <RotateCw className="mr-2 h-4 w-4" /> {t.tryAgain}
          </Button>
          {isPractice ? (
            <Button onClick={handlePracticeFinish}>
              <Check className="mr-2 h-4 w-4" /> {t.donePracticing}
            </Button>
          ) : (
            <Button onClick={() => router.push('/my-lessons')} >
                {t.finish}
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
          <h3 className="text-lg font-semibold mb-2 text-center">{t.rateLesson}</h3>
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
            {isSavingDraft ? t.savingDraft : t.saveDraft}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || isSubmissionLocked}
            className="w-full md:flex-1"
          >
            {isSubmitting ? t.submitting : t.submitAnswers}
          </Button>
        </div>
      )}
      {(!isPractice && isPending) && (
        <p className="text-sm text-gray-500">
          {lastSavedAt
            ? t.lastSaved.replace('{time}', formatDistanceToNow(lastSavedAt, { addSuffix: true }))
            : t.draftNotSaved}
        </p>
      )}
      {(isPractice || !isPending) && (
        <Button
          onClick={handleSubmit}
          disabled={!isPractice ? (isSubmitting || isSubmissionLocked) : false}
          className="w-full"
        >
          {isPractice ? t.checkResults : isSubmitting ? t.submitting : t.submitAnswers}
        </Button>
      )}
    </div>
  );
}
