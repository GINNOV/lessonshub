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
import {
  clearAssignmentDraft,
  getAssignmentDraftKey,
  readAssignmentDraft,
  writeAssignmentDraft,
} from '@/app/components/assignmentDraftStorage';

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
  audioUrl: string | null;
  audioStorageKey?: string | null;
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
  bonusReadSwitches?: number;
  autoSaveEnabled?: boolean;
  copy?: LyricLessonCopy;
};

type LyricLessonCopy = {
  lyricLesson: string;
  readFill: string;
  score: string;
  previousShort: string;
  timeLabel: string;
  readAlongUsed: string;
  readAlong: string;
  readAlongWithCount: string;
  fillBlanks: string;
  guideBoost: string;
  saveDraft: string;
  savingDraft: string;
  referenceTrack: string;
  play: string;
  pause: string;
  correctLabel: string;
  checkAnswers: string;
  submitting: string;
  reset: string;
  draftSaved: string;
  draftNotSaved: string;
  draftSavedToast: string;
  draftError: string;
  submissionSummary: string;
  submissionDetails: string;
  previousAttempt: string;
  readAlongSwitchesUsed: string;
  readAlongBoostError: string;
  readAlongNoneRemaining: string;
  submitError: string;
  submitSuccess: string;
  playbackError: string;
};

const defaultCopy: LyricLessonCopy = {
  lyricLesson: 'Lyric lesson',
  readFill: 'Read & fill',
  score: 'Score',
  previousShort: 'Prev',
  timeLabel: 'Time',
  readAlongUsed: 'Read-along {count}',
  readAlong: 'Read Along',
  readAlongWithCount: 'Read Along ({count} left)',
  fillBlanks: 'Fill the Blanks',
  guideBoost: 'Includes +{count} guide boost{plural}.',
  saveDraft: 'Save Draft',
  savingDraft: 'Saving…',
  referenceTrack: 'Use the reference track for playback.',
  play: 'Play',
  pause: 'Pause',
  correctLabel: 'Correct:',
  checkAnswers: 'Check Answers',
  submitting: 'Submitting…',
  reset: 'Reset',
  draftSaved: 'Draft saved {time}',
  draftNotSaved: 'Draft not saved yet',
  draftSavedToast: 'Draft saved.',
  draftError: 'Unable to save draft right now.',
  submissionSummary: 'You answered {percent}% correctly',
  submissionDetails: '{correct} of {total} blanks · {time} total time',
  previousAttempt: 'Previous attempt: {percent}% · {time}',
  readAlongSwitchesUsed: 'Read-along switches used: {count}',
  readAlongBoostError: 'Unable to use read-along boost right now. Please try again.',
  readAlongNoneRemaining: 'No read-along switches remaining.',
  submitError: 'Unable to submit answers.',
  submitSuccess: 'Answers submitted!',
  playbackError: 'Unable to start playback. Please check the audio source.',
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
  audioStorageKey,
  lines,
  settings,
  status,
  existingAttempt,
  timingSourceUrl,
  lrcUrl,
  draftState,
  bonusReadSwitches = 0,
  autoSaveEnabled = true,
  copy,
}: LyricLessonPlayerProps) {
  const t = copy ?? defaultCopy;
  const safeAudioUrl = typeof audioUrl === 'string' ? audioUrl.trim() : '';
  const safeStorageKey = typeof audioStorageKey === 'string' ? audioStorageKey.trim() : '';
  const isSpotifyLink = safeAudioUrl.includes('open.spotify.com');
  const referenceTrackUrl = timingSourceUrl || (isSpotifyLink ? safeAudioUrl : null);
  const hasAudio = Boolean(!referenceTrackUrl && safeAudioUrl && safeStorageKey);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lineStopAtRef = useRef<number | null>(null);
  const pendingLinePlayRef = useRef(false);
  const [mode, setMode] = useState<'read' | 'fill'>(() =>
    draftState?.mode ?? (settings?.defaultMode === 'fill' ? 'fill' : 'read')
  );
  const baseAllowance =
    typeof settings?.maxReadModeSwitches === 'number' && settings.maxReadModeSwitches >= 0
      ? settings.maxReadModeSwitches
      : null;
  const [baseReadRemaining, setBaseReadRemaining] = useState<number | null>(baseAllowance);
  const [bonusReadRemaining, setBonusReadRemaining] = useState<number>(
    Math.max(0, Math.floor(bonusReadSwitches ?? 0))
  );
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
  const draftKey = getAssignmentDraftKey('lyric', assignmentId);
  const saveInFlightRef = useRef(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didAutoSaveInitRef = useRef(false);
  const restoredFromLocalRef = useRef(false);
  const shownRestoreToastRef = useRef(false);
  const draftRef = useRef<{
    answers: LyricAttemptAnswers;
    mode: 'read' | 'fill';
    readModeSwitches: number;
  }>({
    answers: draftState?.answers ?? {},
    mode: draftState?.mode ?? (settings?.defaultMode === 'fill' ? 'fill' : 'read'),
    readModeSwitches: draftState?.readModeSwitches ?? 0,
  });

  const difficulty = settings?.fillBlankDifficulty ?? 0.2;
  const preparedLines = useMemo(() => prepareLines(lines, difficulty), [lines, difficulty]);

  useEffect(() => {
    const allowance =
      typeof settings?.maxReadModeSwitches === 'number' && settings.maxReadModeSwitches >= 0
        ? settings.maxReadModeSwitches
        : null;
    setBaseReadRemaining(allowance);
  }, [settings?.maxReadModeSwitches, lessonId]);

  useEffect(() => {
    setBonusReadRemaining(Math.max(0, Math.floor(bonusReadSwitches ?? 0)));
  }, [bonusReadSwitches, assignmentId]);

  useEffect(() => {
    if (!draftState) {
      setReadModeSwitchCount(0);
    }
  }, [assignmentId, draftState]);

  useEffect(() => {
    if (status !== AssignmentStatus.PENDING) {
      clearAssignmentDraft(draftKey);
      return;
    }
    const serverUpdatedAt = draftState?.updatedAt ? new Date(draftState.updatedAt).getTime() : 0;
    const localDraft = autoSaveEnabled
      ? readAssignmentDraft<{
          answers: LyricAttemptAnswers;
          mode: 'read' | 'fill';
          readModeSwitches: number;
        }>(draftKey)
      : null;
    const shouldUseLocal = localDraft && localDraft.updatedAt > serverUpdatedAt;
    if (shouldUseLocal) {
      restoredFromLocalRef.current = true;
      setAnswers(localDraft.data.answers ?? {});
      setMode(localDraft.data.mode ?? 'read');
      setReadModeSwitchCount(localDraft.data.readModeSwitches ?? 0);
      setLastSavedAt(new Date(localDraft.updatedAt));
    }
  }, [autoSaveEnabled, draftKey, draftState?.updatedAt, status]);

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
    if (!hasAudio) return;
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
  }, [playStartedAt, hasAudio]);

  useEffect(() => {
    if (!hasAudio || !isPlaying) return;
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
  }, [isPlaying, preparedLines, activeLineId, hasAudio]);

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

  const spendBonusSwitch = useCallback((count: number) => {
    if (count <= 0) return;
    fetch('/api/read-along/use', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count }),
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Failed request');
        }
        const data = await response.json().catch(() => null);
        if (!data?.success) {
          throw new Error(data?.error || 'Unable to use read-along boost');
        }
      })
      .catch(() => {
        setBonusReadRemaining((prev) => prev + count);
        toast.error(t.readAlongBoostError);
      });
  }, [t]);

  const handleModeChange = useCallback(
    (targetMode: 'read' | 'fill') => {
      if (targetMode === mode) return;
      if (targetMode === 'read') {
        if (baseReadRemaining !== null) {
          if (baseReadRemaining <= 0 && bonusReadRemaining <= 0) {
            toast.error(t.readAlongNoneRemaining);
            return;
          }
          if (baseReadRemaining > 0) {
            setBaseReadRemaining((prev) => (prev === null ? prev : Math.max(prev - 1, 0)));
          } else if (bonusReadRemaining > 0) {
            setBonusReadRemaining((prev) => Math.max(prev - 1, 0));
            spendBonusSwitch(1);
          }
        }
        setReadModeSwitchCount((prev) => prev + 1);
      }
      setMode(targetMode);
    },
    [mode, baseReadRemaining, bonusReadRemaining, spendBonusSwitch, t]
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
        const message = typeof errorData?.error === 'string' ? errorData.error : t.submitError;
        throw new Error(message);
      }

      setSubmission({
        scorePercent,
        correct,
        total,
        timeTakenSeconds,
        readModeSwitchesUsed: readModeSwitchCount,
      });
      toast.success(t.submitSuccess);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveDraft = useCallback(
    async ({
      showToast = false,
      showSpinner = false,
    }: {
      showToast?: boolean;
      showSpinner?: boolean;
    }) => {
      if (status !== AssignmentStatus.PENDING || isSubmitting) return false;
      if (saveInFlightRef.current) return false;
      saveInFlightRef.current = true;
      if (showSpinner) setIsSavingDraft(true);
      const snapshot = draftRef.current;
      const result = await saveLyricAssignmentDraft(assignmentId, studentId, {
        answers: snapshot.answers,
        mode: snapshot.mode,
        readModeSwitches: snapshot.readModeSwitches,
      });
      if (showSpinner) setIsSavingDraft(false);
      saveInFlightRef.current = false;
      if (result.success) {
        const now = new Date();
        setLastSavedAt(now);
        writeAssignmentDraft(draftKey, snapshot, now.getTime());
        if (showToast) {
          toast.success(t.draftSavedToast);
        }
      } else if (showToast) {
        toast.error(result.error || t.draftError);
      }
      return result.success;
    },
    [
      assignmentId,
      draftKey,
      isSubmitting,
      status,
      studentId,
      t.draftError,
      t.draftSavedToast,
    ],
  );

  const handleSaveDraft = async () => {
    await saveDraft({ showToast: true, showSpinner: true });
  };

  useEffect(() => {
    if (status !== AssignmentStatus.PENDING) return;
    draftRef.current = {
      answers,
      mode,
      readModeSwitches: readModeSwitchCount,
    };
    if (autoSaveEnabled) {
      writeAssignmentDraft(draftKey, draftRef.current);
    }
  }, [answers, autoSaveEnabled, draftKey, mode, readModeSwitchCount, status]);

  useEffect(() => {
    if (!autoSaveEnabled || status !== AssignmentStatus.PENDING || isSubmitting) return;
    if (!didAutoSaveInitRef.current) {
      didAutoSaveInitRef.current = true;
      return;
    }
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      saveDraft({ showToast: false, showSpinner: false });
    }, 2000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [answers, autoSaveEnabled, isSubmitting, mode, readModeSwitchCount, saveDraft, status]);

  useEffect(() => {
    if (!autoSaveEnabled) return;
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        writeAssignmentDraft(draftKey, draftRef.current);
        saveDraft({ showToast: false, showSpinner: false });
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

  const playFromLine = useCallback((line: PreparedLine) => {
    if (!hasAudio) return;
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
      .catch(() => toast.error(t.playbackError));
  }, [preparedLines, hasAudio, t]);

  const stopPlayback = useCallback(() => {
    if (!hasAudio) return;
    const audioEl = audioRef.current;
    if (!audioEl) return;
    lineStopAtRef.current = null;
    pendingLinePlayRef.current = false;
    audioEl.pause();
  }, [hasAudio]);

  const totalReadSwitchesRemaining =
    baseReadRemaining === null ? null : baseReadRemaining + bonusReadRemaining;
  const readModeDisabled =
    totalReadSwitchesRemaining !== null && totalReadSwitchesRemaining <= 0;
  const readModeLabel =
    totalReadSwitchesRemaining !== null
      ? t.readAlongWithCount.replace('{count}', Math.max(totalReadSwitchesRemaining, 0).toString())
      : t.readAlong;

  const scoreBadge = submission && (
    <Badge className="border-emerald-300/60 bg-emerald-500/15 text-emerald-100">
      {t.score} {submission.scorePercent.toFixed(1)}%
    </Badge>
  );

  const attemptBadge = !submission && existingAttempt && existingAttempt.scorePercent !== null && (
    <Badge className="border-slate-700 bg-slate-900/70 text-slate-100">
      {t.previousShort} {existingAttempt.scorePercent.toFixed(1)}% · {formatDuration(existingAttempt.timeTakenSeconds ?? null)}
    </Badge>
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-500/15 text-teal-200 border border-teal-300/40">
              <Volume2 className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-slate-400">{t.lyricLesson}</p>
              <p className="text-lg font-semibold text-slate-100">{t.readFill}</p>
              <div className="flex flex-wrap gap-2">
                {scoreBadge}
                {attemptBadge}
                {submission && (
                  <Badge variant="outline" className="border-slate-700 text-slate-100">
                    {t.timeLabel} {formatDuration(submission.timeTakenSeconds)}
                  </Badge>
                )}
                {submission && submission.readModeSwitchesUsed !== null && (
                  <Badge variant="outline" className="border-indigo-300/50 text-indigo-100 bg-indigo-500/10">
                    {t.readAlongUsed.replace('{count}', submission.readModeSwitchesUsed.toString())}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:justify-end">
            <div className="grid w-full grid-cols-1 gap-2 text-sm sm:flex sm:min-w-[240px] sm:overflow-hidden sm:rounded-full sm:border sm:border-slate-700 sm:bg-slate-900/70 md:w-auto">
              <Button
                type="button"
                variant={mode === 'read' ? 'default' : 'ghost'}
                className={cn(
                  "w-full sm:flex-1 sm:rounded-full",
                  mode === 'read'
                    ? "border border-teal-300/60 bg-gradient-to-r from-teal-400 to-emerald-500 text-slate-950 shadow-[0_10px_30px_rgba(45,212,191,0.35)] hover:brightness-110"
                    : "border-slate-700 bg-slate-900/70 text-slate-100 hover:border-teal-400/60 hover:text-white"
                )}
                disabled={readModeDisabled}
                onClick={() => handleModeChange('read')}
              >
                {readModeLabel}
              </Button>
              <Button
                type="button"
                variant={mode === 'fill' ? 'default' : 'ghost'}
                className={cn(
                  "w-full sm:flex-1 sm:rounded-full",
                  mode === 'fill'
                    ? "border border-teal-300/60 bg-gradient-to-r from-teal-400 to-emerald-500 text-slate-950 shadow-[0_10px_30px_rgba(45,212,191,0.35)] hover:brightness-110"
                    : "border-slate-700 bg-slate-900/70 text-slate-100 hover:border-teal-400/60 hover:text-white"
                )}
                onClick={() => handleModeChange('fill')}
                disabled={status !== AssignmentStatus.PENDING && !existingAttempt}
              >
                {t.fillBlanks}
              </Button>
            </div>
            {bonusReadRemaining > 0 && baseReadRemaining !== null && (
              <p className="text-[11px] text-emerald-200">
                {t.guideBoost
                  .replace('{count}', bonusReadRemaining.toString())
                  .replace('{plural}', bonusReadRemaining === 1 ? '' : 's')}
              </p>
            )}
            {status === AssignmentStatus.PENDING && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="flex-1 whitespace-nowrap border-slate-700 bg-slate-900/70 text-slate-100 hover:border-teal-400/60 hover:text-white md:flex-none"
                onClick={handleSaveDraft}
                disabled={isSavingDraft || isSubmitting}
              >
                <Save className="mr-2 h-4 w-4" />
                {isSavingDraft ? t.savingDraft : t.saveDraft}
              </Button>
            )}
          </div>
        </div>
        {hasAudio && (
          <audio ref={audioRef} className="mt-4 w-full rounded-lg border border-slate-800 bg-slate-900/70 text-slate-100" src={safeAudioUrl} controls preload="metadata" />
        )}
        {referenceTrackUrl && (
          <div className="mt-3 rounded-lg border border-indigo-300/40 bg-indigo-500/10 px-3 py-2 text-sm text-indigo-100">
            {t.referenceTrack}
          </div>
        )}
      </div>

      <div
        ref={containerRef}
        className="max-h-[520px] space-y-4 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950/80 p-4 shadow-xl"
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
                'rounded-xl border p-4 transition-all',
                isActive
                  ? 'border-teal-300/60 bg-teal-500/10 shadow-[0_12px_30px_rgba(45,212,191,0.25)]'
                  : 'border-slate-700 bg-slate-900/70'
              )}
            >
              <div className="flex flex-col gap-2 text-xs text-slate-300 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 font-semibold text-slate-100">
                    {displayIndex}
                  </span>
                  <span>
                    {formatDuration(line.startTime ?? null)} → {formatDuration(line.endTime ?? null)}
                  </span>
                </div>
                {hasAudio && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => playFromLine(line)} className="h-8 border-slate-700 bg-slate-900/70 text-slate-100 hover:border-teal-400/60 hover:text-white">
                      <Play className="mr-2 h-4 w-4" />
                      {t.play}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={stopPlayback} className="h-8 border-slate-700 bg-slate-900/70 text-slate-100 hover:border-teal-400/60 hover:text-white">
                      <Pause className="mr-2 h-4 w-4" />
                      {t.pause}
                    </Button>
                  </div>
                )}
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
                              {t.correctLabel} {expected}
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
        <div className="flex flex-col gap-3 rounded-2xl border bg-slate-950/80 p-4 shadow-xl border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || preparedLines.every((line) => line.hiddenWords.length === 0)}
          >
            {isSubmitting ? t.submitting : t.checkAnswers}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setAnswers({})}
            disabled={isSubmitting}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {t.reset}
          </Button>
          <p className="text-xs text-gray-500">
            {lastSavedAt
              ? t.draftSaved.replace('{time}', formatDistanceToNow(lastSavedAt, { addSuffix: true }))
              : t.draftNotSaved}
          </p>
        </div>
      )}

      {submission && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-3 text-emerald-700">
            <Sparkles className="h-5 w-5" />
            <div>
              <p className="font-semibold">
                {t.submissionSummary.replace('{percent}', submission.scorePercent.toFixed(1))}
              </p>
              <p className="text-sm">
                {t.submissionDetails
                  .replace('{correct}', submission.correct.toString())
                  .replace('{total}', submission.total.toString())
                  .replace('{time}', formatDuration(submission.timeTakenSeconds))}
              </p>
              {submission.readModeSwitchesUsed !== null && (
                <p className="text-xs">
                  {t.readAlongSwitchesUsed.replace('{count}', submission.readModeSwitchesUsed.toString())}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {status !== AssignmentStatus.PENDING && !submission && existingAttempt && existingAttempt.scorePercent !== null && (
        <div className="rounded-lg border border-slate-700 bg-slate-800 text-slate-100 p-4">
          <p className="text-sm text-slate-300">
            {t.previousAttempt
              .replace('{percent}', existingAttempt.scorePercent.toFixed(1))
              .replace('{time}', formatDuration(existingAttempt.timeTakenSeconds ?? null))}
            {typeof existingAttempt.readModeSwitchesUsed === 'number' && (
              <> · {t.readAlongSwitchesUsed.replace('{count}', existingAttempt.readModeSwitchesUsed.toString())}</>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
