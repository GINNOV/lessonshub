// file: src/app/components/LessonResponseForm.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
import {
  clearAssignmentDraft,
  getAssignmentDraftKey,
  readAssignmentDraft,
  writeAssignmentDraft,
} from '@/app/components/assignmentDraftStorage';

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
  autoSaveEnabled?: boolean;
  copy?: LessonResponseCopy;
}

type LessonResponseCopy = {
  practiceNotice: string;
  deadlinePassed: string;
  submitSuccess: string;
  submitError: string;
  draftSaved: string;
  draftError: string;
  answerPlaceholder: string;
  notesLabel: string;
  notesPlaceholder: string;
  rateLesson: string;
  saveDraft: string;
  savingDraft: string;
  submit: string;
  submitting: string;
  lastSaved: string;
  draftNotSaved: string;
  confirmTitle: string;
  confirmDescription: string;
  confirmLabel: string;
  confirmPending: string;
};

const defaultCopy: LessonResponseCopy = {
  practiceNotice: "Practice mode is active. Your answers aren't saved or submitted.",
  deadlinePassed: "The deadline has passed. Submissions are disabled for this lesson.",
  submitSuccess: "Your assignment has been submitted successfully!",
  submitError: "There was an error submitting your assignment.",
  draftSaved: "Draft saved. You can finish later.",
  draftError: "Unable to save draft right now.",
  answerPlaceholder: "Your answer...",
  notesLabel: "Notes for your teacher (optional)",
  notesPlaceholder: "Anything you'd like to add?",
  rateLesson: "Rate this lesson:",
  saveDraft: "Save Draft",
  savingDraft: "Saving draft...",
  submit: "Submit Assignment",
  submitting: "Submitting...",
  lastSaved: "Last saved {time}",
  draftNotSaved: "Draft not saved yet",
  confirmTitle: "Submit assignment?",
  confirmDescription: "You will not be able to edit your answers after submitting.",
  confirmLabel: "Submit",
  confirmPending: "Submitting...",
};

const parseStringArray = (value: unknown, length: number): string[] | null => {
  if (!Array.isArray(value) || length <= 0) return null;
  return Array.from({ length }, (_, index) => {
    const entry = value[index];
    if (typeof entry === 'string') return entry;
    if (entry === null || entry === undefined) return '';
    return String(entry);
  });
};

const normalizeAnswerArray = (value: unknown, length: number): string[] => {
  const parsed = parseStringArray(value, length);
  return parsed ?? Array(length).fill('');
};

export default function LessonResponseForm({
  assignment,
  isSubmissionLocked = false,
  practiceMode = false,
  autoSaveEnabled = true,
  copy,
}: LessonResponseFormProps) {
  const t = copy ?? defaultCopy;
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
  const draftKey = getAssignmentDraftKey('standard', assignment.id);
  const saveInFlightRef = useRef(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didAutoSaveInitRef = useRef(false);
  const restoredFromLocalRef = useRef(false);
  const shownRestoreToastRef = useRef(false);
  const draftRef = useRef<{ answers: string[]; studentNotes: string; rating: number }>({
    answers: [],
    studentNotes: '',
    rating: 0,
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
      clearAssignmentDraft(draftKey);
    } else {
      const serverUpdatedAt = assignment.draftUpdatedAt
        ? new Date(assignment.draftUpdatedAt).getTime()
        : 0;
      const localDraft = autoSaveEnabled
        ? readAssignmentDraft<{ answers: string[]; studentNotes: string; rating: number }>(draftKey)
        : null;
      const shouldUseLocal = localDraft && localDraft.updatedAt > serverUpdatedAt;
      if (shouldUseLocal) {
        restoredFromLocalRef.current = true;
        const normalizedAnswers = normalizeAnswerArray(localDraft?.data.answers, questions.length);
        setAnswers(normalizedAnswers);
        setStudentNotes(localDraft?.data.studentNotes ?? '');
        setRating(typeof localDraft?.data.rating === 'number' ? localDraft.data.rating : 0);
        setLastSavedAt(new Date(localDraft.updatedAt));
      } else {
        const draft = parseStringArray(assignment.draftAnswers, questions.length);
        setAnswers(draft ?? Array(questions.length).fill(''));
        setStudentNotes(assignment.draftStudentNotes ?? '');
        setRating(typeof assignment.draftRating === 'number' ? assignment.draftRating : 0);
        setLastSavedAt(assignment.draftUpdatedAt ? new Date(assignment.draftUpdatedAt) : null);
      }
      setIsReadOnly(false);
    }
  }, [assignment, autoSaveEnabled, draftKey, practiceMode, questions.length]);

  useEffect(() => {
    if (practiceMode || isReadOnly || assignment.status !== 'PENDING') return;
    draftRef.current = {
      answers,
      studentNotes,
      rating,
    };
    if (autoSaveEnabled) {
      writeAssignmentDraft(draftKey, draftRef.current);
    }
  }, [answers, assignment.status, autoSaveEnabled, draftKey, isReadOnly, practiceMode, rating, studentNotes]);
  
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
        toast.error(t.deadlinePassed);
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
      toast.success(t.submitSuccess);
      router.push('/my-lessons');
      router.refresh(); 
    } else {
      toast.error(result.error || t.submitError);
    }
    setIsDialogOpen(false);
    setIsLoading(false);
  };
  
  const saveDraft = useCallback(
    async ({
      showToast = false,
      showSpinner = false,
      refresh = false,
    }: {
      showToast?: boolean;
      showSpinner?: boolean;
      refresh?: boolean;
    }) => {
      if (practiceMode || isReadOnly || isSubmissionLocked || assignment.status !== 'PENDING') {
        return false;
      }
      if (saveInFlightRef.current) return false;
      saveInFlightRef.current = true;
      if (showSpinner) setIsSavingDraft(true);
      const snapshot = draftRef.current;
      const result = await saveStandardAssignmentDraft(assignment.id, assignment.studentId, {
        answers: snapshot.answers,
        studentNotes: snapshot.studentNotes,
        rating: snapshot.rating > 0 ? snapshot.rating : undefined,
      });
      if (showSpinner) setIsSavingDraft(false);
      saveInFlightRef.current = false;
      if (result.success) {
        const now = new Date();
        setLastSavedAt(now);
        writeAssignmentDraft(draftKey, snapshot, now.getTime());
        if (showToast) {
          toast.success(t.draftSaved);
        }
        if (refresh) {
          router.refresh();
        }
      } else if (showToast) {
        toast.error(result.error || t.draftError);
      }
      return result.success;
    },
    [
      assignment.id,
      assignment.status,
      assignment.studentId,
      draftKey,
      isReadOnly,
      isSubmissionLocked,
      practiceMode,
      router,
      t.draftError,
      t.draftSaved,
    ],
  );

  const handleSaveDraft = async () => {
    await saveDraft({ showToast: true, showSpinner: true, refresh: true });
  };

  useEffect(() => {
    if (!autoSaveEnabled || practiceMode || isReadOnly || isSubmissionLocked || assignment.status !== 'PENDING') {
      return;
    }
    if (!didAutoSaveInitRef.current) {
      didAutoSaveInitRef.current = true;
      return;
    }
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      saveDraft({ showToast: false, showSpinner: false, refresh: false });
    }, 2000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [
    answers,
    assignment.status,
    autoSaveEnabled,
    isReadOnly,
    isSubmissionLocked,
    practiceMode,
    rating,
    saveDraft,
    studentNotes,
  ]);

  useEffect(() => {
    if (!autoSaveEnabled) return;
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        writeAssignmentDraft(draftKey, draftRef.current);
        saveDraft({ showToast: false, showSpinner: false, refresh: false });
      } else if (
        document.visibilityState === 'visible' &&
        restoredFromLocalRef.current &&
        !shownRestoreToastRef.current
      ) {
        toast('Draft restored from this device. Tap Save Draft to sync.');
        shownRestoreToastRef.current = true;
      }
    };
    window.addEventListener('pagehide', handleVisibility);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('pagehide', handleVisibility);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [autoSaveEnabled, draftKey, saveDraft]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {practiceMode && (
        <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-3 text-sm text-amber-100">
          {t.practiceNotice}
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
            placeholder={t.answerPlaceholder}
            required
            disabled={isLoading || isReadOnly}
            rows={4}
          />
        </div>
      ))}

      <div className="space-y-2">
        <Label htmlFor="student-notes">{t.notesLabel}</Label>
        <Textarea
          id="student-notes"
          value={studentNotes}
          onChange={(e) => setStudentNotes(e.target.value)}
          placeholder={t.notesPlaceholder}
          disabled={isLoading || isReadOnly}
        />
      </div>
        
      {!isReadOnly && !practiceMode && (
         <div className="mt-6 border-t pt-6">
            <div className="flex items-center gap-2">
                <Label>{t.rateLesson}</Label>
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
              {isSavingDraft ? t.savingDraft : t.saveDraft}
            </Button>
            <Button type="submit" disabled={isLoading || isSubmissionLocked} className="w-full md:flex-1">
              {isLoading ? t.submitting : t.submit}
            </Button>
          </div>
          <p className="text-sm text-gray-500">
            {lastSavedAt
              ? t.lastSaved.replace("{time}", formatDistanceToNow(lastSavedAt, { addSuffix: true }))
              : t.draftNotSaved}
          </p>
          <ConfirmDialog
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            title={t.confirmTitle}
            description={t.confirmDescription}
            confirmLabel={t.confirmLabel}
            pendingLabel={t.confirmPending}
            confirmVariant="default"
            isConfirming={isLoading}
            onConfirm={handleConfirmSubmit}
          />
        </>
      )}
    </form>
  );
}
