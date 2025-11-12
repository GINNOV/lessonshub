// file: src/app/components/LyricLessonPlayer.tsx
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AssignmentStatus } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ExternalLink, Pause, Play, RefreshCw, Save, Sparkles, Volume2 } from 'lucide-react';
import type { LyricLine, LyricLessonSettings } from './LyricLessonEditor';
import { saveLyricAssignmentDraft } from '@/actions/lessonActions';
import { formatDistanceToNow } from 'date-fns';

type LyricAttemptAnswers = Record<string, string[]>;

type PreparedToken = {
  value: string;
  isWord: boolean;
  hidden: boolean;
  answerIndex: number | null;
};

type PreparedLine = {
  id: string;
  text: string;
  startTime: number | null;
  endTime: number | null;
  tokens: PreparedToken[];
  hiddenWords: string[];
};

type LyricLessonPlayerProps = {
  assignmentId: string;
  studentId: string;
  lessonId: string;
  audioUrl: string;
  lines: LyricLine[];
  settings: LyricLessonSettings | null;
  status: AssignmentStatus;
  existingAttempt?: {
    scorePercent: number | null;
    timeTakenSeconds: number | null;
    answers: LyricAttemptAnswers | null;
    readModeSwitchesUsed: number | null;
    createdAt: string;
  } | null;
  timingSourceUrl?: string | null;
  lrcUrl?: string | null;
  draftState?: {
    answers: LyricAttemptAnswers | null;
    mode: 'read' | 'fill' | null;
    readModeSwitches: number | null;
    updatedAt: string | null;
  } | null;
};

type SubmissionState = {
  scorePercent: number;
  correct: number;
  total: number;
  timeTakenSeconds: number;
  readModeSwitchesUsed: number | null;
};

const sanitizeWord = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/['’‘‛‵`´]/g, '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();

const tokenizeLine = (text: string): { value: string; isWord: boolean }[] => {
  if (!text) return [];
  const tokens = text.match(/[\w']+|[^\w\s]+|\s+/g);
  if (!tokens) return [];
  return tokens.map((token) => ({
    value: token,
    isWord: /\w/.test(token),
  }));
};

const selectHiddenIndices = (line: LyricLine, tokens: { value: string; isWord: boolean }[], difficulty: number) => {
  const wordTokens = tokens
    .map((token, index) => ({ ...token, index }))
    .filter((token) => token.isWord && sanitizeWord(token.value).length >= 3);

  if (wordTokens.length === 0) return new Set<number>();

  const explicitWords = Array.isArray(line.hiddenWords) ? line.hiddenWords.map(sanitizeWord).filter(Boolean) : [];

  if (explicitWords.length > 0) {
    const explicitSet = new Set<number>();
    let cursor = 0;
    explicitWords.forEach((targetWord) => {
      for (let i = cursor; i < wordTokens.length; i += 1) {
        const tokenWord = sanitizeWord(wordTokens[i].value);
        if (tokenWord === targetWord && !explicitSet.has(wordTokens[i].index)) {
          explicitSet.add(wordTokens[i].index);
          cursor = i + 1;
          break;
        }
      }
    });
    if (explicitSet.size > 0) return explicitSet;
  }

  const targetCount = Math.max(1, Math.min(wordTokens.length, Math.round(wordTokens.length * difficulty)));
  const ranked = [...wordTokens].sort((a, b) => sanitizeWord(b.value).length - sanitizeWord(a.value).length);
  const selected = new Set<number>();
  for (const token of ranked) {
    if (selected.size >= targetCount) break;
    selected.add(token.index);
  }
  return selected;
};

const prepareLines = (lines: LyricLine[], difficulty: number): PreparedLine[] => {
  return lines.map((line) => {
    const tokens = tokenizeLine(line.text);
    const hiddenIndices = selectHiddenIndices(line, tokens, difficulty);

    const preparedTokens: PreparedToken[] = tokens.map((token, index) => ({
      value: token.value,
      isWord: token.isWord,
      hidden: token.isWord && hiddenIndices.has(index),
      answerIndex: token.isWord && hiddenIndices.has(index)
        ? Array.from(hiddenIndices).sort((a, b) => a - b).indexOf(index)
        : null,
    }));

    const hiddenWords = preparedTokens
      .filter((token) => token.hidden && token.answerIndex !== null)
      .map((token) => token.value);

    return {
      id: line.id,
      text: line.text,
      startTime: line.startTime,
      endTime: line.endTime,
      tokens: preparedTokens,
      hiddenWords,
    };
  });
};

const computeScore = (preparedLines: PreparedLine[], answers: LyricAttemptAnswers) => {
  let correct = 0;
  let total = 0;

  preparedLines.forEach((line) => {
    const userAnswers = answers[line.id] ?? [];
    line.hiddenWords.forEach((word, index) => {
      const expected = sanitizeWord(word);
      const actual = sanitizeWord(userAnswers[index] ?? '');
      if (expected) {
        total += 1;
        if (expected === actual) {
          correct += 1;
        }
      }
    });
  });

  const scorePercent = total > 0 ? Math.round((correct / total) * 1000) / 10 : 100;
  return { correct, total, scorePercent };
};

const formatDuration = (seconds: number | null) => {
  if (seconds === null || Number.isNaN(seconds)) return '--:--';
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export default function LyricLessonPlayer({
  assignmentId,
  studentId,
  lessonId,
  audioUrl,
  lines,
  settings,
  status,
  existingAttempt,
  timingSourceUrl,
  lrcUrl,
  draftState,
}: LyricLessonPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lineStopAtRef = useRef<number | null>(null);
  const pendingLinePlayRef = useRef(false);
  const [mode, setMode] = useState<'read' | 'fill'>(() =>
    draftState?.mode ?? (settings?.defaultMode === 'fill' ? 'fill' : 'read')
  );
  const [remainingReadToggles, setRemainingReadToggles] = useState<number | null>(() => {
    const allowance = settings?.maxReadModeSwitches;
    return typeof allowance === 'number' && allowance >= 0 ? allowance : null;
  });
  const [activeLineId, setActiveLineId] = useState<string | null>(lines[0]?.id ?? null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [answers, setAnswers] = useState<LyricAttemptAnswers>(() => draftState?.answers ?? existingAttempt?.answers ?? {});
  const [submission, setSubmission] = useState<SubmissionState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [playStartedAt, setPlayStartedAt] = useState<number | null>(null);
  const [readModeSwitchCount, setReadModeSwitchCount] = useState(draftState?.readModeSwitches ?? 0);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(() =>
    draftState?.updatedAt ? new Date(draftState.updatedAt) : null
  );

  const difficulty = settings?.fillBlankDifficulty ?? 0.2;
  const preparedLines = useMemo(() => prepareLines(lines, difficulty), [lines, difficulty]);

  useEffect(() => {
    const allowance = settings?.maxReadModeSwitches;
    setRemainingReadToggles(typeof allowance === 'number' && allowance >= 0 ? allowance : null);
  }, [settings?.maxReadModeSwitches, lessonId]);

  useEffect(() => {
    if (!draftState) {
      setReadModeSwitchCount(0);
    }
  }, [assignmentId, draftState]);

  useEffect(() => {
    if (!existingAttempt) return;
    if (existingAttempt.scorePercent !== null) {
      setSubmission({
        scorePercent: existingAttempt.scorePercent,
        correct: 0,
        total: 0,
        timeTakenSeconds: existingAttempt.timeTakenSeconds ?? 0,
        readModeSwitchesUsed:
          typeof existingAttempt.readModeSwitchesUsed === 'number'
            ? existingAttempt.readModeSwitchesUsed
            : null,
      });
    }
  }, [existingAttempt]);

  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;

    const handlePlay = () => {
      setIsPlaying(true);
      if (!pendingLinePlayRef.current) {
        lineStopAtRef.current = null;
      }
      pendingLinePlayRef.current = false;
      if (playStartedAt === null) {
        setPlayStartedAt(performance.now());
      }
    };
    const handlePause = () => {
      setIsPlaying(false);
      pendingLinePlayRef.current = false;
    };
    const handleEnded = () => {
      setIsPlaying(false);
      pendingLinePlayRef.current = false;
      lineStopAtRef.current = null;
    };

    audioEl.addEventListener('play', handlePlay);
    audioEl.addEventListener('pause', handlePause);
    audioEl.addEventListener('ended', handleEnded);

    return () => {
      audioEl.removeEventListener('play', handlePlay);
      audioEl.removeEventListener('pause', handlePause);
      audioEl.removeEventListener('ended', handleEnded);
    };
  }, [playStartedAt]);

  useEffect(() => {
    if (!isPlaying) return;
    const audioEl = audioRef.current;
    if (!audioEl) return;

    let animationFrame: number;

    const updateActiveLine = () => {
      const time = audioEl.currentTime;
      const stopAt = lineStopAtRef.current;
      if (stopAt !== null && time >= stopAt) {
        lineStopAtRef.current = null;
        audioEl.pause();
      }

      let selected: PreparedLine | null = null;

      for (let i = 0; i < preparedLines.length; i += 1) {
        const current = preparedLines[i];
        const next = preparedLines[i + 1];
        const windowStart =
          typeof current.startTime === 'number'
            ? current.startTime
            : i === 0
            ? 0
            : preparedLines[i - 1].endTime ?? 0;
        const windowEnd =
          typeof current.endTime === 'number'
            ? current.endTime + 0.5
            : typeof next?.startTime === 'number'
            ? next.startTime - 0.05
            : windowStart + 6;
        if (time >= windowStart && time < windowEnd) {
          selected = current;
          break;
        }
      }

      if (!selected) {
        selected = preparedLines.find((line) => line.id === activeLineId) ?? preparedLines.at(-1) ?? null;
      }

      if (selected && selected.id !== activeLineId) {
        setActiveLineId(selected.id);
      }

      animationFrame = requestAnimationFrame(updateActiveLine);
    };

    animationFrame = requestAnimationFrame(updateActiveLine);
    return () => cancelAnimationFrame(animationFrame);
  }, [isPlaying, preparedLines, activeLineId]);

  useEffect(() => {
    if (!activeLineId) return;
    const container = containerRef.current;
    if (!container) return;
    const target = container.querySelector<HTMLDivElement>(`[data-line-id="${activeLineId}"]`);
    if (!target) return;
    target.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [activeLineId]);

  const handleAnswerChange = (lineId: string, answerIndex: number, value: string) => {
    setAnswers((prev) => {
      const lineAnswers = [...(prev[lineId] ?? [])];
      lineAnswers[answerIndex] = value;
      return { ...prev, [lineId]: lineAnswers };
    });
  };

  const handleModeChange = useCallback(
    (targetMode: 'read' | 'fill') => {
      if (targetMode === mode) return;
      if (targetMode === 'read') {
        if (remainingReadToggles !== null) {
          if (remainingReadToggles <= 0) {
            toast.error('No read-along switches remaining.');
            return;
          }
          setRemainingReadToggles((prev) => (prev === null ? prev : prev - 1));
        }
        setReadModeSwitchCount((prev) => prev + 1);
      }
      setMode(targetMode);
    },
    [mode, remainingReadToggles]
  );

  const handleSubmit = async () => {
    if (status !== AssignmentStatus.PENDING) return;
    setIsSubmitting(true);
    try {
      const { correct, total, scorePercent } = computeScore(preparedLines, answers);
      const now = performance.now();
      const elapsedMs = playStartedAt ? now - playStartedAt : 0;
      const timeTakenSeconds = Math.max(0, Math.round(elapsedMs / 1000));

      const response = await fetch('/api/lessons/lyric/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId,
          assignmentId,
          scorePercent,
          timeTakenSeconds,
          answers,
          readModeSwitchesUsed: readModeSwitchCount,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = typeof errorData?.error === 'string' ? errorData.error : 'Unable to submit answers.';
        throw new Error(message);
      }

      setSubmission({
        scorePercent,
        correct,
        total,
        timeTakenSeconds,
        readModeSwitchesUsed: readModeSwitchCount,
      });
      toast.success('Answers submitted!');
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    if (status !== AssignmentStatus.PENDING || isSubmitting || isSavingDraft) return;
    setIsSavingDraft(true);
    const result = await saveLyricAssignmentDraft(assignmentId, studentId, {
      answers,
      mode,
      readModeSwitches: readModeSwitchCount,
    });
    setIsSavingDraft(false);
    if (result.success) {
      const now = new Date();
      setLastSavedAt(now);
      toast.success('Draft saved.');
    } else {
      toast.error(result.error || 'Unable to save draft right now.');
    }
  };

  const playFromLine = useCallback((line: PreparedLine) => {
    const audioEl = audioRef.current;
    if (!audioEl) return;
    if (line.startTime !== null) {
      audioEl.currentTime = line.startTime;
    }
    const lineIndex = preparedLines.findIndex((item) => item.id === line.id);
    const nextLine = lineIndex >= 0 ? preparedLines[lineIndex + 1] : null;
    const nextStart = typeof nextLine?.startTime === 'number' ? nextLine.startTime : null;
    const safeStart = typeof line.startTime === 'number' ? line.startTime : audioEl.currentTime;

    let stopPoint: number | null = null;
    if (typeof line.endTime === 'number') {
      const paddedEnd = line.endTime + 0.45;
      stopPoint = paddedEnd;
      if (nextStart !== null) {
        stopPoint = Math.min(stopPoint, nextStart - 0.05);
      }
    } else if (nextStart !== null) {
      stopPoint = nextStart - 0.05;
    }

    if (stopPoint !== null) {
      const minStop = safeStart + 0.2;
      if (stopPoint < minStop) {
        stopPoint = minStop;
      }
      if (stopPoint <= audioEl.currentTime) {
        stopPoint = audioEl.currentTime + 0.2;
      }
    }

    lineStopAtRef.current = stopPoint;
    pendingLinePlayRef.current = true;
    audioEl
      .play()
      .then(() => setActiveLineId(line.id))
      .catch(() => toast.error('Unable to start playback. Please check the audio source.'));
  }, [preparedLines]);

  const stopPlayback = useCallback(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;
    lineStopAtRef.current = null;
    pendingLinePlayRef.current = false;
    audioEl.pause();
  }, []);

  const readSwitchesRemaining = remainingReadToggles;
  const readModeDisabled = mode !== 'read' && readSwitchesRemaining !== null && readSwitchesRemaining <= 0;
  const readModeLabel = readSwitchesRemaining !== null
    ? `Read Along (${Math.max(readSwitchesRemaining, 0)} left)`
    : 'Read Along';

  const scoreBadge = submission && (
    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
      Score: {submission.scorePercent.toFixed(1)}%
    </Badge>
  );

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-slate-50 p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Volume2 className="h-5 w-5 text-indigo-500" />
            <span className="font-semibold text-slate-700">Lyric Lesson Player</span>
            {scoreBadge}
            {submission && (
              <Badge variant="outline">
                Time: {formatDuration(submission.timeTakenSeconds)}
              </Badge>
            )}
            {submission && submission.readModeSwitchesUsed !== null && (
              <Badge variant="outline" className="border-indigo-200 text-indigo-700">
                Read along: {submission.readModeSwitchesUsed}
              </Badge>
            )}
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end">
            <Button
              type="button"
              size="sm"
              variant={mode === 'read' ? 'default' : 'outline'}
              disabled={readModeDisabled}
              onClick={() => handleModeChange('read')}
            >
              {readModeLabel}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === 'fill' ? 'default' : 'outline'}
              onClick={() => handleModeChange('fill')}
              disabled={status !== AssignmentStatus.PENDING && !existingAttempt}
            >
              Fill the Blanks
            </Button>
            {status === AssignmentStatus.PENDING && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="flex-1 whitespace-nowrap sm:flex-none"
                onClick={handleSaveDraft}
                disabled={isSavingDraft || isSubmitting}
              >
                <Save className="mr-2 h-4 w-4" />
                {isSavingDraft ? 'Saving…' : 'Save Draft'}
              </Button>
            )}
            {timingSourceUrl && (
              <Button asChild type="button" size="sm" variant="outline">
                <a href={timingSourceUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Reference Track
                </a>
              </Button>
            )}

          </div>
        </div>
        <audio ref={audioRef} className="mt-4 w-full" src={audioUrl} controls preload="metadata" />
      </div>

      <div
        ref={containerRef}
        className="max-h-[480px] space-y-4 overflow-y-auto rounded-lg border bg-white p-4"
      >
        {preparedLines.map((line, index) => {
          const isActive = line.id === activeLineId;
          const displayIndex = index + 1;
          const userAnswers = answers[line.id] ?? [];

          return (
            <div
              key={line.id}
              data-line-id={line.id}
              className={cn(
                'rounded-md border p-4 transition-all',
                isActive ? 'border-indigo-400 bg-indigo-50 shadow-sm' : 'border-slate-200'
              )}
            >
              <div className="flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 font-semibold text-slate-600">
                    {displayIndex}
                  </span>
                  <span>
                    {formatDuration(line.startTime ?? null)} → {formatDuration(line.endTime ?? null)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => playFromLine(line)}>
                    <Play className="mr-2 h-4 w-4" />
                    Play line
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={stopPlayback}>
                    <Pause className="mr-2 h-4 w-4" />
                    Pause
                  </Button>
                </div>
              </div>
              <div className="mt-3 text-lg leading-relaxed text-slate-800">
                {mode === 'fill'
                  ? line.tokens.map((token, tokenIndex) => {
                      if (!token.hidden || token.answerIndex === null) {
                        return <span key={tokenIndex}>{token.value}</span>;
                      }
                      const existingValue = userAnswers[token.answerIndex] ?? '';
                      const expected = line.hiddenWords[token.answerIndex] ?? '';
                      const isCorrect =
                        submission && sanitizeWord(existingValue) === sanitizeWord(expected);
                      const isIncorrect =
                        submission && sanitizeWord(existingValue) !== sanitizeWord(expected);

                      return (
                        <span key={tokenIndex} className="mx-1 inline-block">
                          <input
                            className={cn(
                              'min-w-[80px] rounded-md border px-2 py-1 text-center text-sm shadow-sm focus:border-indigo-500 focus:outline-none',
                              isCorrect && 'border-emerald-400 bg-emerald-50 text-emerald-700',
                              isIncorrect && 'border-rose-400 bg-rose-50 text-rose-700'
                            )}
                            type="text"
                            value={existingValue}
                            disabled={status !== AssignmentStatus.PENDING || !!submission}
                            onChange={(event) =>
                              handleAnswerChange(line.id, token.answerIndex!, event.target.value)
                            }
                          />
                          {submission && isIncorrect && (
                            <span className="mt-1 block text-xs text-rose-500">
                              Correct: {expected}
                            </span>
                          )}
                        </span>
                      );
                    })
                  : <span>{line.text}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {mode === 'fill' && status === AssignmentStatus.PENDING && (
        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || preparedLines.every((line) => line.hiddenWords.length === 0)}
          >
            {isSubmitting ? 'Submitting…' : 'Check Answers'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setAnswers({})}
            disabled={isSubmitting}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <p className="text-xs text-gray-500">
            {lastSavedAt
              ? `Draft saved ${formatDistanceToNow(lastSavedAt, { addSuffix: true })}`
              : 'Draft not saved yet'}
          </p>
        </div>
      )}

      {submission && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-3 text-emerald-700">
            <Sparkles className="h-5 w-5" />
            <div>
              <p className="font-semibold">
                You answered {submission.scorePercent.toFixed(1)}% correctly
              </p>
              <p className="text-sm">
                {submission.correct} of {submission.total} blanks · {formatDuration(submission.timeTakenSeconds)} total time
              </p>
              {submission.readModeSwitchesUsed !== null && (
                <p className="text-xs">
                  Read-along switches used: {submission.readModeSwitchesUsed}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {status !== AssignmentStatus.PENDING && !submission && existingAttempt && existingAttempt.scorePercent !== null && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-600">
            Previous attempt: {existingAttempt.scorePercent.toFixed(1)}% ·{' '}
            {formatDuration(existingAttempt.timeTakenSeconds ?? null)}
            {typeof existingAttempt.readModeSwitchesUsed === 'number' && (
              <> · Read-along switches used: {existingAttempt.readModeSwitchesUsed}</>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
