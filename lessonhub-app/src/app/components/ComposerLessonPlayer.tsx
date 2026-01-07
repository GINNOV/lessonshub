// file: src/app/components/ComposerLessonPlayer.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Assignment, Lesson } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import Rating from '@/app/components/Rating';
import { saveComposerAssignmentDraft, submitComposerAssignment } from '@/actions/lessonActions';
import { hashComposerSeed, normalizeComposerWord, parseComposerSentence } from '@/lib/composer';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Terminal } from 'lucide-react';

type ComposerQuestion = {
  id: string;
  prompt: string;
  answer: string;
  maxTries?: number | null;
};

type SerializableLesson = Omit<Lesson, 'price'> & {
  price: number;
  composerConfig: {
    hiddenSentence: string;
    questionBank: ComposerQuestion[];
    maxTries?: number | null;
  } | null;
};

type ComposerAssignment = Omit<Assignment, 'lesson'> & {
  lesson: SerializableLesson;
  draftAnswers?: unknown;
  draftRating?: number | null;
  draftUpdatedAt?: string | Date | null;
};

interface ComposerLessonPlayerProps {
  assignment: ComposerAssignment;
  isSubmissionLocked?: boolean;
}

export default function ComposerLessonPlayer({ assignment, isSubmissionLocked = false }: ComposerLessonPlayerProps) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<number, string>>(() => {
    if (!assignment.draftAnswers || typeof assignment.draftAnswers !== 'object') return {};
    const draft = assignment.draftAnswers as Record<string, unknown>;
    if (draft.answers && typeof draft.answers === 'object') {
      return draft.answers as Record<number, string>;
    }
    return draft as Record<number, string>;
  });
  const [tries, setTries] = useState<Record<number, number>>(() => {
    if (!assignment.draftAnswers || typeof assignment.draftAnswers !== 'object') return {};
    const draft = assignment.draftAnswers as Record<string, unknown>;
    if (draft.tries && typeof draft.tries === 'object') {
      return draft.tries as Record<number, number>;
    }
    return {};
  });
  const [rating, setRating] = useState<number>(assignment.draftRating ?? 0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didAutoSaveInitRef = useRef(false);
  const neoTestRef = useRef<HTMLDivElement | null>(null);

  const composerConfig = assignment.lesson.composerConfig;
  const sentence = composerConfig?.hiddenSentence ?? '';
  const questionBank = useMemo(() => composerConfig?.questionBank ?? [], [composerConfig?.questionBank]);
  const maxTries = composerConfig?.maxTries ?? 1;
  const { tokens, words, uniqueWords } = useMemo(() => parseComposerSentence(sentence), [sentence]);
  const sortedOptions = useMemo(
    () => [...uniqueWords].sort((a, b) => a.localeCompare(b)),
    [uniqueWords],
  );
  const questionsByWord = useMemo(() => {
    const map = new Map<string, ComposerQuestion[]>();
    questionBank.forEach((question) => {
      const key = normalizeComposerWord(question.answer);
      if (!map.has(key)) map.set(key, []);
      map.get(key)?.push(question);
    });
    return map;
  }, [questionBank]);

  const wordQuestions = useMemo(() => {
    return words.map((word, index) => {
      const key = normalizeComposerWord(word);
      const candidates = questionsByWord.get(key) ?? [];
      if (candidates.length === 0) {
        return {
          index,
          word,
          prompt: `Select the word that matches: "${word}".`,
          maxTries: null,
        };
      }
      const seed = hashComposerSeed(`${assignment.id}-${word}-${index}`);
      const selection = candidates[seed % candidates.length];
      return {
        index,
        word,
        prompt: selection.prompt,
        maxTries: selection.maxTries ?? null,
      };
    });
  }, [assignment.id, questionsByWord, words]);

  const totalExtraTries = useMemo(() => {
    return wordQuestions.reduce((sum, question) => {
      const value = Number(tries?.[question.index] ?? 0);
      const questionMax = question.maxTries ?? maxTries;
      if (!Number.isFinite(value) || value <= questionMax) return sum;
      return sum + (value - questionMax);
    }, 0);
  }, [tries, maxTries, wordQuestions]);

  const answeredCount = useMemo(
    () => Object.keys(answers).filter((key) => answers[Number(key)]?.trim()).length,
    [answers],
  );

  const playFeedbackTone = (isCorrect: boolean) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      const audioContext = audioContextRef.current;
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      const now = audioContext.currentTime;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = isCorrect ? 'triangle' : 'square';
      oscillator.frequency.setValueAtTime(isCorrect ? 880 : 220, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(isCorrect ? 0.15 : 0.2, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.3);
    } catch (error) {
      console.warn('Composer feedback sound failed', error);
    }
  };

  const handleSelect = (index: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [index]: value }));
    setTries((prev) => ({ ...prev, [index]: (prev[index] ?? 0) + 1 }));
    const expected = wordQuestions[index]?.word ?? '';
    const isCorrect = normalizeComposerWord(value) === normalizeComposerWord(expected);
    playFeedbackTone(isCorrect);
    if (neoTestRef.current) {
      neoTestRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (isCorrect) {
      setCurrentQuestionIndex((prev) => Math.min(prev + 1, wordQuestions.length - 1));
    }
  };

  const handleSubmit = async () => {
    if (isSubmissionLocked) {
      toast.error('The deadline has passed. Submissions are disabled for this lesson.');
      return;
    }
    if (words.length === 0) {
      toast.error('This composer lesson is missing a sentence.');
      return;
    }
    if (answeredCount !== words.length) {
      toast.error('Answer every question to reveal the full sentence.');
      return;
    }
    setIsSubmitting(true);
    const payload = wordQuestions.map((question) => ({
      index: question.index,
      word: answers[question.index] ?? '',
      prompt: question.prompt,
    }));
    const result = await submitComposerAssignment(assignment.id, assignment.studentId, {
      answers: payload,
      tries,
      rating: rating > 0 ? rating : undefined,
    });
    if (result.success) {
      toast.success('Composer submitted! Your sentence is revealed.');
      router.refresh();
    } else {
      toast.error(result.error || 'There was an error submitting your assignment.');
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    if (isSubmissionLocked || assignment.status !== 'PENDING') return;
    setIsSavingDraft(true);
    const result = await saveComposerAssignmentDraft(assignment.id, assignment.studentId, {
      answers,
      tries,
      rating: rating > 0 ? rating : undefined,
    });
    setIsSavingDraft(false);
    if (result.success) {
      toast.success('Draft saved.');
      router.refresh();
    } else {
      toast.error(result.error || 'Unable to save draft right now.');
    }
  };

  useEffect(() => {
    if (isSubmissionLocked || assignment.status !== 'PENDING') return;
    if (!didAutoSaveInitRef.current) {
      didAutoSaveInitRef.current = true;
      return;
    }

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      await saveComposerAssignmentDraft(assignment.id, assignment.studentId, {
        answers,
        tries,
        rating: rating > 0 ? rating : undefined,
      });
    }, 200);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [answers, tries, rating, assignment.id, assignment.status, assignment.studentId, isSubmissionLocked]);

  const isGraded = assignment.status === 'GRADED' || assignment.status === 'FAILED';
  const correctCount = wordQuestions.reduce((count, question) => {
    const selected = answers[question.index] ?? '';
    if (normalizeComposerWord(selected) === normalizeComposerWord(question.word)) {
      return count + 1;
    }
    return count;
  }, 0);
  const revealedWords = isGraded ? correctCount : answeredCount;

  if (!composerConfig) {
    return (
      <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 p-4 text-rose-100">
        Composer lesson data is missing. Please contact support.
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div
        ref={neoTestRef}
        className="rounded-3xl border border-emerald-400/40 bg-gradient-to-b from-slate-900 via-emerald-950/20 to-slate-950 p-3 sm:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-[0.2em] text-emerald-200/70">
          <span className="font-semibold">NEO Test</span>
          <span className="text-emerald-200/60">
            {totalExtraTries > 0
              ? `Extra tries: ${totalExtraTries} · €${totalExtraTries * 50} + ${totalExtraTries * 50} pts`
              : 'Extra tries: 0'}
          </span>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-emerald-400/30 bg-black/70 p-6 shadow-inner">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(34,197,94,0.08)_1px,transparent_1px)] bg-[size:100%_6px] opacity-40" />
          <div className="relative z-10 font-mono text-lg leading-relaxed text-emerald-100">
            {tokens.map((token, idx) => {
              if (token.type === 'separator') {
                return <span key={`sep-${idx}`}>{token.value}</span>;
              }
              const answer = answers[token.index ?? 0] ?? '';
              const isCorrect = normalizeComposerWord(answer) === normalizeComposerWord(token.value);
              const showWord = Boolean(answer) && isCorrect;
              const showWrongFlash = Boolean(answer) && !isCorrect;
              return (
                <span
                  key={`word-${idx}`}
                  className={`inline-block min-w-[0.5rem] transition-opacity duration-500 ${
                    showWord ? 'opacity-100' : 'opacity-30'
                  } ${
                    showWrongFlash ? 'animate-pulse text-rose-300/90 drop-shadow-[0_0_8px_rgba(248,113,113,0.65)]' : ''
                  }`}
                >
                  {showWord ? token.value : '▮▮▮'}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-800/70 bg-slate-950/80 p-3 sm:p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-100">
            <Terminal className="h-5 w-5" aria-hidden="true" />
            <span className="text-lg font-semibold">Terminal</span>
          </div>
          <p className="text-xs text-slate-400">{answeredCount} / {words.length} answered</p>
        </div>
        {wordQuestions.length > 0 && (() => {
          const question = wordQuestions[currentQuestionIndex];
          return (
            <div className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-3 sm:p-4">
              <div className="mb-3 flex items-center justify-between text-xs text-slate-400">
                <Button
                  type="button"
                  onClick={() => setCurrentQuestionIndex((prev) => Math.max(prev - 1, 0))}
                  disabled={currentQuestionIndex === 0}
                  className="border border-emerald-400/60 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30"
                >
                  <span className="hidden sm:inline">Previous</span>
                  <ChevronLeft className="h-4 w-4 sm:hidden" aria-hidden="true" />
                </Button>
                <span>
                  Question {currentQuestionIndex + 1} of {wordQuestions.length}
                </span>
                <Button
                  type="button"
                  onClick={() =>
                    setCurrentQuestionIndex((prev) => Math.min(prev + 1, wordQuestions.length - 1))
                  }
                  disabled={currentQuestionIndex >= wordQuestions.length - 1}
                  className="border border-emerald-400/60 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="h-4 w-4 sm:hidden" aria-hidden="true" />
                </Button>
              </div>
              <p className="text-sm font-semibold text-slate-200">
                {question.index + 1}. {question.prompt}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Tries: {tries[question.index] ?? 0} / {maxTries}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {sortedOptions.map((option) => {
                  const selected = answers[question.index] === option;
                  const isCorrectSelection =
                    selected &&
                    normalizeComposerWord(option) === normalizeComposerWord(question.word);
                  return (
                    <button
                      key={`${question.index}-${option}`}
                      type="button"
                      onClick={() => handleSelect(question.index, option)}
                      className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                        selected
                          ? isCorrectSelection
                            ? 'border-emerald-400/70 bg-emerald-500/20 text-emerald-100'
                            : 'border-rose-400/70 bg-rose-500/20 text-rose-100'
                          : 'border-slate-800 bg-slate-950/70 text-slate-200 hover:border-emerald-300/50'
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}

        <div className="mt-6 border-t border-slate-800/70 pt-6">
          <h4 className="text-sm font-semibold text-slate-200">Rate this lesson</h4>
          <div className="mt-2">
            <Rating initialRating={rating} onRatingChange={setRating} />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="button" variant="outline" onClick={handleSaveDraft} disabled={isSavingDraft}>
            {isSavingDraft ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit assignment'}
          </Button>
        </div>
      </div>
    </div>
  );
}
