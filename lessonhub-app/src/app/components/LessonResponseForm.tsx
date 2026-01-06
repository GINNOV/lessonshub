// file: src/app/components/LessonResponseForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { Assignment, Lesson } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { submitStandardAssignment, saveStandardAssignmentDraft } from '@/actions/lessonActions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Rating from './Rating';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { formatDistanceToNow } from 'date-fns';

type SerializableLesson = Omit<Lesson, 'price'> & {
  price: number;
};

type StandardAssignment = Omit<Assignment, 'lesson'> & {
  lesson: SerializableLesson;
  answers: string[];
  draftAnswers?: unknown;
  draftStudentNotes?: string | null;
  draftRating?: number | null;
  draftUpdatedAt?: string | Date | null;
};

interface LessonResponseFormProps {
  assignment: StandardAssignment;
  isSubmissionLocked?: boolean;
  practiceMode?: boolean;
}

export default function LessonResponseForm({
  assignment,
  isSubmissionLocked = false,
  practiceMode = false,
}: LessonResponseFormProps) {
  const router = useRouter();
  const [answers, setAnswers] = useState<string[]>([]);
  const [studentNotes, setStudentNotes] = useState('');
  const [rating, setRating] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(() => {
    if (!assignment.draftUpdatedAt) return null;
    return new Date(assignment.draftUpdatedAt);
  });

  const normalizeQuestions = (value: any): { question: string; expectedAnswer: string }[] => {
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => {
        if (typeof item === 'string') return { question: item, expectedAnswer: '' };
        if (item && typeof item === 'object') {
          return {
            question: typeof (item as any).question === 'string' ? (item as any).question : '',
            expectedAnswer: typeof (item as any).expectedAnswer === 'string' ? (item as any).expectedAnswer : '',
          };
        }
        return { question: String(item ?? ''), expectedAnswer: '' };
      })
      .filter((q) => q.question.trim());
  };

  const questions = normalizeQuestions(assignment.lesson.questions);

  const parseStringArray = (value: unknown, length: number): string[] | null => {
    if (!Array.isArray(value) || length <= 0) return null;
    return Array.from({ length }, (_, index) => {
      const entry = value[index];
      if (typeof entry === 'string') return entry;
      if (entry === null || entry === undefined) return '';
      return String(entry);
    });
  };

  useEffect(() => {
    if (practiceMode) {
      setAnswers(Array(questions.length).fill(''));
      setStudentNotes('');
      setRating(0);
      setIsReadOnly(false);
      setLastSavedAt(null);
      return;
    }

    if (assignment.status !== 'PENDING') {
      const studentAnswers = Array.isArray(assignment.answers) ? assignment.answers : [];
      setAnswers(studentAnswers);
      setStudentNotes(assignment.studentNotes || '');
      setRating(assignment.rating || 0);
      setIsReadOnly(true);
    } else {
      const draft = parseStringArray(assignment.draftAnswers, questions.length);
      setAnswers(draft ?? Array(questions.length).fill(''));
      setStudentNotes(assignment.draftStudentNotes ?? '');
      setRating(typeof assignment.draftRating === 'number' ? assignment.draftRating : 0);
      setIsReadOnly(false);
      setLastSavedAt(assignment.draftUpdatedAt ? new Date(assignment.draftUpdatedAt) : null);
    }
  }, [assignment, questions.length, practiceMode]);
  
  const handleAnswerChange = (index: number, value: string) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (practiceMode) {
      return;
    }
    if (isReadOnly || isSubmissionLocked) {
      if (isSubmissionLocked) {
        toast.error("The deadline has passed. Submissions are disabled for this lesson.");
      }
      return;
    }

    setIsDialogOpen(true);
  };

  const handleConfirmSubmit = async () => {
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
    setIsDialogOpen(false);
    setIsLoading(false);
  };
  
  const handleSaveDraft = async () => {
    if (practiceMode || isReadOnly || isSubmissionLocked) return;
    setIsSavingDraft(true);
    const result = await saveStandardAssignmentDraft(assignment.id, assignment.studentId, {
      answers,
      studentNotes,
      rating: rating > 0 ? rating : undefined,
    });
    setIsSavingDraft(false);
    if (result.success) {
      const now = new Date();
      setLastSavedAt(now);
      toast.success('Draft saved. You can finish later.');
      router.refresh();
    } else {
      toast.error(result.error || 'Unable to save draft right now.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {practiceMode && (
        <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-3 text-sm text-amber-100">
          Practice mode is active. Your answers aren&apos;t saved or submitted.
        </div>
      )}
      {questions.map((question, index) => (
        <div key={index} className="space-y-2">
          <Label htmlFor={`question-${index}`} className="font-semibold">
            {index + 1}. {question.question}
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
        
      {!isReadOnly && !practiceMode && (
         <div className="mt-6 border-t pt-6">
            <div className="flex items-center gap-2">
                <Label>Rate this lesson:</Label>
                <Rating initialRating={rating} onRatingChange={setRating} disabled={isLoading || isReadOnly || isSubmissionLocked} />
            </div>
        </div>
      )}

      {!isReadOnly && !practiceMode && (
        <>
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
            <Button type="submit" disabled={isLoading || isSubmissionLocked} className="w-full md:flex-1">
              {isLoading ? 'Submitting...' : 'Submit Assignment'}
            </Button>
          </div>
          <p className="text-sm text-gray-500">
            {lastSavedAt
              ? `Last saved ${formatDistanceToNow(lastSavedAt, { addSuffix: true })}`
              : 'Draft not saved yet'}
          </p>
          <ConfirmDialog
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            title="Submit assignment?"
            description="You will not be able to edit your answers after submitting."
            confirmLabel="Submit"
            pendingLabel="Submitting..."
            confirmVariant="default"
            isConfirming={isLoading}
            onConfirm={handleConfirmSubmit}
          />
        </>
      )}
    </form>
  );
}
