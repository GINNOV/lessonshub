// file: src/app/dashboard/grade/[assignmentId]/page.tsx
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getSubmissionForGrading } from "@/actions/lessonActions";
import { LessonType, PointReason, Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import GradingForm from "@/app/components/GradingForm";
import LessonContentView from "@/app/components/LessonContentView";
import LearningSessionPlayer from "@/app/components/LearningSessionPlayer";
import type { LyricLine, LyricLessonSettings } from "@/app/components/LyricLessonEditor";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, UserRound, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  parseMultiChoiceAnswers,
  resolveSelectedLabel,
  resolveSelectedOption,
} from "@/lib/multiChoiceAnswers";
import { marked } from "marked";

const normalizeLyricLines = (value: unknown): LyricLine[] => {
  if (!Array.isArray(value)) return [];
  const normalized: LyricLine[] = [];
  value.forEach((item) => {
    if (!item || typeof item !== "object") return;
    const record = item as Record<string, unknown>;
    const text = typeof record.text === "string" ? record.text : "";
    if (!text.trim()) return;
    const id = typeof record.id === "string" ? record.id : randomUUID();
    const startTimeValue =
      typeof record.startTime === "number"
        ? record.startTime
        : typeof record.startTime === "string" && record.startTime.trim()
        ? Number(record.startTime)
        : null;
    const endTimeValue =
      typeof record.endTime === "number"
        ? record.endTime
        : typeof record.endTime === "string" && record.endTime.trim()
        ? Number(record.endTime)
        : null;
    const hiddenWords =
      Array.isArray(record.hiddenWords)
        ? record.hiddenWords.filter((word): word is string => typeof word === "string" && word.trim().length > 0)
        : undefined;
    const startTime = Number.isFinite(startTimeValue) ? Number(startTimeValue) : null;
    const endTime = Number.isFinite(endTimeValue) ? Number(endTimeValue) : null;
    normalized.push({
      id,
      text,
      startTime,
      endTime,
      hiddenWords,
    });
  });
  return normalized;
};

marked.setOptions({
  gfm: true,
  breaks: true,
});

const normalizeUserDecimals = <T extends { referralRewardPercent?: unknown; referralRewardMonthlyAmount?: unknown; defaultLessonPrice?: unknown }>(
  user: T | null | undefined
) => {
  if (!user) return user ?? null;
  return {
    ...user,
    referralRewardPercent: typeof (user as any).referralRewardPercent === 'object' && (user as any).referralRewardPercent?.toNumber
      ? (user as any).referralRewardPercent.toNumber()
      : (user as any).referralRewardPercent,
    referralRewardMonthlyAmount: typeof (user as any).referralRewardMonthlyAmount === 'object' && (user as any).referralRewardMonthlyAmount?.toNumber
      ? (user as any).referralRewardMonthlyAmount.toNumber()
      : (user as any).referralRewardMonthlyAmount,
    defaultLessonPrice: typeof (user as any).defaultLessonPrice === 'object' && (user as any).defaultLessonPrice?.toNumber
      ? (user as any).defaultLessonPrice.toNumber()
      : (user as any).defaultLessonPrice,
  } as T;
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

const prepareLinesForReview = (lines: LyricLine[], difficulty: number) => {
  return lines.map((line) => {
    const tokens = tokenizeLine(line.text);
    const hiddenIndices = selectHiddenIndices(line, tokens, difficulty);
    const orderedHidden = Array.from(hiddenIndices).sort((a, b) => a - b);
    const hiddenWords = orderedHidden.map((index) => tokens[index]?.value ?? '');

    return {
      id: line.id,
      startTime: line.startTime ?? null,
      endTime: line.endTime ?? null,
      hiddenWords,
      tokens: tokens.map((token, index) => ({
        value: token.value,
        hidden: token.isWord && hiddenIndices.has(index),
        answerIndex: token.isWord && hiddenIndices.has(index) ? orderedHidden.indexOf(index) : null,
      })),
    };
  });
};

const formatDuration = (seconds: number | null) => {
  if (seconds === null || Number.isNaN(seconds)) return '--:--';
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const formatContent = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

export default async function GradeSubmissionPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const session = await auth();
  if (!session || session.user.role !== Role.TEACHER) {
    redirect("/");
  }

  const { assignmentId } = await params;
  const submission = await getSubmissionForGrading(
    assignmentId,
    session.user.id
  );

  if (!submission) {
    return (
      <div className="text-center">
        <p>
          Submission not found or you don&apos;t have permission to view it.
        </p>
        <Button asChild className="mt-4">
          <Link href="/dashboard">Return to Dashboard</Link>
        </Button>
      </div>
    );
  }

  const lyricConfig = submission.lesson.lyricConfig
    ? {
        ...submission.lesson.lyricConfig,
        lines: normalizeLyricLines(submission.lesson.lyricConfig.lines),
        settings: (submission.lesson.lyricConfig.settings as LyricLessonSettings | null) ?? null,
      }
    : null;

  const lessonWithAttempts = submission.lesson as typeof submission.lesson & {
    lyricAttempts?: Array<{
      scorePercent: { toString(): string } | number | null;
      timeTakenSeconds: number | null;
      answers: unknown;
      createdAt: Date | string;
    }>;
  };
  const rawLyricAttempts = Array.isArray(lessonWithAttempts.lyricAttempts)
    ? lessonWithAttempts.lyricAttempts
    : [];

  const lyricAttempts = rawLyricAttempts.map(attempt => ({
    scorePercent: attempt.scorePercent ? Number(attempt.scorePercent.toString()) : null,
    timeTakenSeconds: attempt.timeTakenSeconds ?? null,
    answers: (attempt.answers as Record<string, string[]> | null) ?? null,
    readModeSwitchesUsed:
      typeof attempt.readModeSwitchesUsed === 'number' ? attempt.readModeSwitchesUsed : null,
    createdAt:
      attempt.createdAt instanceof Date
        ? attempt.createdAt.toISOString()
        : new Date(attempt.createdAt).toISOString(),
  }));

  const serializableSubmission = {
    ...submission,
    student: normalizeUserDecimals(submission.student),
    teacher: normalizeUserDecimals((submission as any).teacher ?? null),
    lesson: {
      ...submission.lesson,
      price: submission.lesson.price.toNumber(),
      lyricConfig,
      lyricAttempts,
    }
  };
  (serializableSubmission as any).lyricDraftAnswers = parseDraftAnswers(submission.lyricDraftAnswers);
  serializableSubmission.lyricDraftMode = (submission.lyricDraftMode as 'read' | 'fill' | null) ?? null;
  serializableSubmission.lyricDraftReadSwitches =
    typeof submission.lyricDraftReadSwitches === 'number' ? submission.lyricDraftReadSwitches : null;
  serializableSubmission.lyricDraftUpdatedAt = submission.lyricDraftUpdatedAt;

  const flashcards = submission.lesson.flashcards ?? [];
  const multiChoiceQuestions = submission.lesson.multiChoiceQuestions ?? [];
  const lyricLessonConfig = serializableSubmission.lesson.lyricConfig;
  const lyricExistingAttempt = serializableSubmission.lesson.lyricAttempts?.[0] ?? null;
  const lyricPreparedLines = lyricLessonConfig
    ? prepareLinesForReview(
        lyricLessonConfig.lines as LyricLine[],
        typeof lyricLessonConfig.settings?.fillBlankDifficulty === 'number'
          ? lyricLessonConfig.settings.fillBlankDifficulty
          : 0.2
      )
    : [];

  const parseFlashcardAnswers = (): Record<string, 'correct' | 'incorrect'> | null => {
    if (submission.lesson.type !== LessonType.FLASHCARD) return null;
    const raw = submission.answers;
    if (!raw) return null;

    function extractOutcomeFromObject(obj: Record<string, unknown>): 'correct' | 'incorrect' | null {
      const possibleKeys = [
        'result',
        'status',
        'value',
        'outcome',
        'answer',
        'selection',
        'response',
        'marked',
        'choice',
        'correct',
        'isCorrect',
        'wasCorrect',
        'right',
        'wrong',
      ];

      for (const key of possibleKeys) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const candidate = obj[key];
          const outcome = toOutcome(candidate);
          if (outcome) return outcome;
        }
      }

      // Some legacy data might nest inside `details` or `meta`
      const nestedKeys = ['details', 'meta', 'data'];
      for (const key of nestedKeys) {
        const nested = obj[key];
        if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
          const nestedOutcome = extractOutcomeFromObject(nested as Record<string, unknown>);
          if (nestedOutcome) return nestedOutcome;
        }
      }

      return null;
    }

    function toOutcome(value: unknown): 'correct' | 'incorrect' | null {
      if (value === null || value === undefined) return null;
      if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (['correct', 'right', 'true', 'yes', 'y', '1', 'pass'].includes(normalized)) return 'correct';
        if (['incorrect', 'wrong', 'false', 'no', 'n', '0', 'fail'].includes(normalized)) return 'incorrect';
        return null;
      }
      if (typeof value === 'boolean') return value ? 'correct' : 'incorrect';
      if (typeof value === 'number') return value > 0 ? 'correct' : 'incorrect';
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return extractOutcomeFromObject(value as Record<string, unknown>);
      }
      return null;
    }

    const assignSequentially = (source: unknown[]): Record<string, 'correct' | 'incorrect'> => {
      const record: Record<string, 'correct' | 'incorrect'> = {};
      source.forEach((entry, index) => {
        const card = flashcards[index];
        const outcome = toOutcome(entry);
        if (card && outcome) {
          record[card.id] = outcome;
        }
      });
      return record;
    };

    const buildRecord = (value: unknown): Record<string, 'correct' | 'incorrect'> => {
      const result: Record<string, 'correct' | 'incorrect'> = {};
      if (!value) return result;

      if (typeof value === 'string') {
        try {
          return buildRecord(JSON.parse(value));
        } catch {
          return result;
        }
      }

      if (Array.isArray(value)) {
        value.forEach((entry, index) => {
          if (Array.isArray(entry) && entry.length >= 2) {
            const id = String(entry[0]);
            const outcome = toOutcome(entry[1]);
            if (id && outcome) {
              result[id] = outcome;
            }
            return;
          }
          if (entry && typeof entry === 'object') {
            const obj = entry as Record<string, unknown>;
            const id =
              obj.flashcardId ??
              obj.cardId ??
              obj.id ??
              obj.flashcard_id ??
              obj.card_id ??
              undefined;
            const outcome = toOutcome(
              obj.result ??
              obj.status ??
              obj.value ??
              obj.outcome ??
              obj.correct ??
              obj.isCorrect ??
              obj.answer ??
              obj.selection
            );
            if (id && outcome) {
              result[String(id)] = outcome;
              return;
            }
            const fallbackOutcome = extractOutcomeFromObject(obj);
            if (id && fallbackOutcome) {
              result[String(id)] = fallbackOutcome;
              return;
            }
            const nestedFromObject = buildRecord(obj);
            Object.assign(result, nestedFromObject);
            return;
          }
          if (typeof entry === 'string' && entry.includes(':')) {
            const [rawId, rawOutcome] = entry.split(':', 2);
            const outcome = toOutcome(rawOutcome);
            if (rawId && outcome) {
              result[rawId] = outcome;
              return;
            }
          }
          const card = flashcards[index];
          const fallbackOutcome = toOutcome(entry);
          if (card && fallbackOutcome) {
            result[card.id] = fallbackOutcome;
          }
        });

        if (Object.keys(result).length === 0 && flashcards.length === value.length) {
          return assignSequentially(value);
        }

        return result;
      }

      if (value && typeof value === 'object') {
        try {
          const plain = JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
          Object.entries(plain).forEach(([key, val]) => {
            const directOutcome = toOutcome(val);
            if (directOutcome) {
              result[key] = directOutcome;
              return;
            }
            if (Array.isArray(val)) {
              const nested = buildRecord(val);
              Object.assign(result, nested);
              return;
            }
            if (val && typeof val === 'object') {
              const nested = buildRecord(val);
              Object.assign(result, nested);
            }
          });
          return result;
        } catch {
          return result;
        }
      }

      return result;
    };

    const parsed = buildRecord(raw);
    return Object.keys(parsed).length > 0 ? parsed : null;
  };

  const flashcardAnswers = parseFlashcardAnswers();
  const correctCount = flashcardAnswers ? Object.values(flashcardAnswers).filter(a => a === 'correct').length : 0;
  const incorrectCount = flashcardAnswers ? Object.values(flashcardAnswers).filter(a => a === 'incorrect').length : 0;
  const multiChoiceAnswers = parseMultiChoiceAnswers(
    submission.answers,
    multiChoiceQuestions
  );
  const multiChoiceDetails = multiChoiceQuestions.map((question, index) => {
    const answer = multiChoiceAnswers[question.id];
    const selectedOption = resolveSelectedOption(question, answer);
    const correctOption = question.options.find(option => option.isCorrect) ?? null;
    let isCorrect: boolean | null = null;
    if (selectedOption && correctOption) {
      isCorrect = selectedOption.id === correctOption.id;
    } else if (typeof answer?.isCorrect === 'boolean') {
      isCorrect = answer.isCorrect;
    }
    const selectedLabel = resolveSelectedLabel(question, answer, selectedOption);
    return {
      question,
      index,
      answer,
      selectedOption,
      correctOption,
      isCorrect,
      selectedLabel,
    };
  });
  const multiChoiceSummary = multiChoiceDetails.reduce(
    (acc, detail) => {
      if (detail.isCorrect === true) {
        acc.correct += 1;
      } else if (detail.isCorrect === false) {
        acc.incorrect += 1;
      }
      return acc;
    },
    { correct: 0, incorrect: 0 }
  );
  const multiChoiceUnanswered = Math.max(
    multiChoiceDetails.length - (multiChoiceSummary.correct + multiChoiceSummary.incorrect),
    0
  );
  const standardQuestions = Array.isArray(serializableSubmission.lesson.questions)
    ? (serializableSubmission.lesson.questions as unknown[]).map((item) => {
        if (typeof item === 'string') {
          return { question: item.trim(), expectedAnswer: '' };
        }
        if (item && typeof item === 'object') {
          const record = item as Record<string, unknown>;
          const questionText =
            typeof record.question === 'string'
              ? record.question
              : typeof record.prompt === 'string'
              ? record.prompt
              : '';
          const expectedText = typeof record.expectedAnswer === 'string' ? record.expectedAnswer : '';
          return {
            question: formatContent(questionText).trim(),
            expectedAnswer: formatContent(expectedText).trim(),
          };
        }
        return { question: formatContent(item).trim(), expectedAnswer: '' };
      }).filter((item) => item.question)
    : [];
  const learningSessionCards = Array.isArray((serializableSubmission.lesson as any).learningSessionCards)
    ? ((serializableSubmission.lesson as any).learningSessionCards as Array<{
        id: string;
        orderIndex: number;
        content1: string | null;
        content2: string | null;
        content3?: string | null;
        content4?: string | null;
        extra?: string | null;
      }>)
    : [];

  const newsArticleHtml =
    submission.lesson.type === LessonType.NEWS_ARTICLE && submission.lesson.newsArticleConfig?.markdown
      ? ((await marked.parse(submission.lesson.newsArticleConfig.markdown)) as string)
      : null;

  const newsArticleTapSummary = submission.lesson.type === LessonType.NEWS_ARTICLE
    ? await (async () => {
        const transactions = await prisma.pointTransaction.findMany({
          where: {
            assignmentId: submission.id,
            reason: PointReason.NEWS_ARTICLE_TAP,
          },
          select: { note: true },
        });
        const counts = new Map<string, { label: string; count: number }>();
        let tapTotal = 0;
        transactions.forEach((tx) => {
          if (!tx.note) return;
          const match = tx.note.match(/News Article tap:\s*(.+)$/i);
          if (!match?.[1]) return;
          const wordRaw = match[1].trim();
          if (!wordRaw) return;
          const key = wordRaw.toLowerCase();
          const existing = counts.get(key);
          if (existing) {
            existing.count += 1;
          } else {
            counts.set(key, { label: wordRaw, count: 1 });
          }
          tapTotal += 1;
        });
        const entries = Array.from(counts.values()).sort((a, b) => b.count - a.count);
        return { total: tapTotal, entries };
      })()
    : null;

  return (
    <div>
      <Button variant="link" asChild className="mb-4 pl-0">
        <Link href={`/dashboard/submissions/${submission.lessonId}`}>
          &larr; Back to Submissions
        </Link>
      </Button>
      <h1 className="text-3xl font-bold">Grade Submission</h1>
      <p className="mt-1 text-slate-300">
        Student: {submission.student.name || submission.student.email}
      </p>

      {submission.lesson.type === LessonType.STANDARD ? (
        <div className="mt-6">
          <GradingForm assignment={serializableSubmission} />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className="space-y-6 rounded-lg border border-slate-800/70 bg-slate-950/70 p-6 text-slate-100 shadow-md">
            <div>
              <h2 className="border-b border-slate-800 pb-2 text-xl font-semibold text-slate-100">
                Student&apos;s Response
              </h2>

              {submission.lesson.type === LessonType.FLASHCARD && (
              <div className="mt-4 space-y-3">
                {flashcards.length > 0 ? (
                  <>
                    <div className="flex justify-around rounded-md border border-slate-800/70 bg-slate-900/70 p-3">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-emerald-300">{correctCount}</p>
                        <p className="text-sm text-slate-400">Marked Correct</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-rose-300">{incorrectCount}</p>
                        <p className="text-sm text-slate-400">Marked Incorrect</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {flashcards.map(flashcard => {
                        const result = flashcardAnswers?.[flashcard.id] ?? null;
                        return (
                          <div
                            key={flashcard.id}
                            className={cn(
                              "space-y-3 rounded-md border p-3 transition-colors text-slate-100",
                              "border-slate-800/70 bg-slate-900/70",
                              result === 'correct' && 'border-emerald-400/60 bg-emerald-900/40',
                              result === 'incorrect' && 'border-rose-400/60 bg-rose-900/40'
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <div className="max-w-md">
                                <p className="text-sm font-semibold uppercase text-slate-400">Front</p>
                                <p className="text-base font-semibold text-slate-100">{flashcard.term}</p>
                                {flashcard.termImageUrl && (
                                  <div className="mt-2">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={flashcard.termImageUrl}
                                      alt={`Flashcard term ${flashcard.term}`}
                                      className="h-auto w-full max-w-xs rounded-md border object-cover"
                                    />
                                  </div>
                                )}
                              </div>
                              {result === 'correct' ? (
                                <div className="flex items-center gap-1 rounded-full bg-emerald-900/40 px-3 py-1 text-sm font-semibold text-emerald-100 border border-emerald-400/60">
                                  <CheckCircle2 className="h-4 w-4" />
                                  <span>Right</span>
                                </div>
                              ) : result === 'incorrect' ? (
                                <div className="flex items-center gap-1 rounded-full bg-rose-900/40 px-3 py-1 text-sm font-semibold text-rose-100 border border-rose-400/60">
                                  <XCircle className="h-4 w-4" />
                                  <span>Wrong</span>
                                </div>
                              ) : (
                                <div className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-sm font-semibold text-slate-300">
                                  Not Reviewed
                                </div>
                              )}
                            </div>
                            <div className="max-w-md">
                              <p className="text-sm font-semibold uppercase text-slate-400">Back</p>
                              <p className="text-base text-slate-100">{flashcard.definition}</p>
                              {flashcard.definitionImageUrl && (
                                <div className="mt-2">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={flashcard.definitionImageUrl}
                                    alt={`Flashcard definition ${flashcard.term}`}
                                    className="h-auto w-full max-w-xs rounded-md border object-cover"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <p className="rounded-md border border-dashed border-slate-700 bg-slate-900 p-4 text-sm text-slate-300">
                    This lesson does not have any flashcards configured yet.
                  </p>
                )}
              </div>
              )}
              {submission.lesson.type === LessonType.NEWS_ARTICLE && (
                <div className="mt-4 space-y-3">
                  <div className="rounded-md border border-slate-800/70 bg-slate-900/70 p-4">
                    <p className="text-sm font-semibold uppercase text-slate-400">Tap summary</p>
                    <p className="mt-1 text-2xl font-bold text-emerald-300">
                      {newsArticleTapSummary?.total ?? 0} taps
                    </p>
                    <p className="text-xs text-slate-400">Total word taps recorded.</p>
                  </div>
                  {newsArticleTapSummary && newsArticleTapSummary.entries.length > 0 ? (
                    <div className="space-y-2">
                      {newsArticleTapSummary.entries.map(({ label, count }) => (
                        <div
                          key={`${label}-${count}`}
                          className="flex items-center justify-between rounded-md border border-slate-800/70 bg-slate-900/70 px-3 py-2 text-sm text-slate-200"
                        >
                          <span className="font-semibold">{label}</span>
                          <span className="text-slate-400">{count} taps</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">No taps recorded yet.</p>
                  )}
                </div>
              )}

              {submission.lesson.type === LessonType.MULTI_CHOICE && (
              <div className="mt-4 space-y-3">
                {multiChoiceDetails.length > 0 ? (
                  <>
                    <div className="flex flex-wrap justify-around gap-4 rounded-md border border-slate-800/70 bg-slate-900/70 p-3">
                      <div className="min-w-[90px] text-center">
                        <p className="text-2xl font-bold text-emerald-300">{multiChoiceSummary.correct}</p>
                        <p className="text-sm text-slate-400">Correct</p>
                      </div>
                      <div className="min-w-[90px] text-center">
                        <p className="text-2xl font-bold text-rose-300">{multiChoiceSummary.incorrect}</p>
                        <p className="text-sm text-slate-400">Incorrect</p>
                      </div>
                      <div className="min-w-[90px] text-center">
                        <p className="text-2xl font-bold text-slate-200">{multiChoiceUnanswered}</p>
                        <p className="text-sm text-slate-400">Unanswered</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {multiChoiceDetails.map(detail => {
                        const {
                          question,
                          index: questionIndex,
                          selectedOption,
                          correctOption,
                          isCorrect,
                          answer,
                          selectedLabel,
                        } = detail;
                        const hasSelection = Boolean(
                          selectedOption ||
                          selectedLabel ||
                          answer?.selectedAnswerId ||
                          typeof answer?.selectedAnswerIndex === 'number' ||
                          typeof answer?.isCorrect === 'boolean'
                        );
                        const fallbackSelectedOptionId =
                          !selectedOption && isCorrect === true && correctOption
                            ? correctOption.id
                            : null;
                        const statusLabel =
                          isCorrect === true
                            ? 'Correct'
                            : isCorrect === false && hasSelection
                              ? 'Incorrect'
                              : !hasSelection
                                ? 'No answer'
                                : null;
                        const statusBadgeClasses = cn(
                          'rounded-full px-3 py-1 text-xs font-semibold',
                          statusLabel === 'Correct' && 'border border-emerald-400/60 bg-emerald-900/40 text-emerald-100',
                          statusLabel === 'Incorrect' && 'border border-rose-400/60 bg-rose-900/40 text-rose-100',
                          statusLabel === 'No answer' && 'border border-slate-700 bg-slate-900 text-slate-200'
                        );
                        const selectedAnswerClasses = cn(
                          "flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold",
                          isCorrect === true && "border-emerald-400/60 bg-emerald-900/40 text-emerald-100",
                          isCorrect === false && "border-rose-400/60 bg-rose-900/40 text-rose-100",
                          isCorrect === null && "border-slate-700 bg-slate-900 text-slate-200"
                        );
                        return (
                          <div key={question.id} className="space-y-3 rounded-md border border-slate-800/70 bg-slate-900/70 p-4">
                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                              <div>
                                <p className="text-sm font-semibold uppercase text-slate-400">Question {questionIndex + 1}</p>
                                <p className="text-base text-slate-100">{question.question}</p>
                              </div>
                              {statusLabel && (
                                <Badge variant="outline" className={statusBadgeClasses}>
                                  {statusLabel}
                                </Badge>
                              )}
                            </div>
                            {!selectedOption && selectedLabel && (
                              <div className={selectedAnswerClasses}>
                                <UserRound className="h-4 w-4" />
                                <span className="font-normal">{selectedLabel}</span>
                              </div>
                            )}
                            <div className="space-y-2">
                              {question.options.map(option => {
                                const isSelected = Boolean(
                                  (selectedOption && option.id === selectedOption.id) ||
                                  (fallbackSelectedOptionId && option.id === fallbackSelectedOptionId)
                                );
                                const isCorrectOption = Boolean(correctOption && option.id === correctOption.id);
                                const optionClasses = cn(
                                  "flex flex-col gap-2 rounded-md border p-3 text-sm transition-colors md:flex-row md:items-center md:justify-between",
                                  "border-slate-800/70 bg-slate-900/70 text-slate-100",
                                  isSelected && isCorrect === true && "border-emerald-400/70 bg-emerald-900/40 text-emerald-100",
                                  isSelected && isCorrect !== true && "border-rose-400/70 bg-rose-900/40 text-rose-100",
                                  !isSelected && isCorrectOption && "border-emerald-400/50 bg-emerald-950/40 text-emerald-100",
                                  !isSelected && !isCorrectOption && "border-slate-800/70 bg-slate-900/70"
                                );
                                return (
                                  <div key={option.id} className={optionClasses}>
                                    <span className="text-slate-100">{option.text}</span>
                                    <div className="flex flex-wrap gap-2">
                                      {isSelected && isCorrect === false && (
                                        <span
                                          className={cn(
                                            "rounded-full px-2 py-1 text-xs font-semibold",
                                            "bg-yellow-900/40 text-yellow-100 border border-yellow-400/60"
                                          )}
                                          aria-label="Student selection"
                                          title="Student selection"
                                        >
                                          <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                                        </span>
                                      )}
                                      {isCorrectOption && (
                                        <span className="rounded-full border border-emerald-400/60 bg-emerald-900/40 px-2 py-1 text-xs font-semibold text-emerald-100">
                                          Correct answer
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <p className="rounded-md border border-dashed border-slate-700 bg-slate-900 p-4 text-sm text-slate-300">
                    This lesson does not include any multiple choice questions yet.
                  </p>
                )}
              </div>
              )}

              {submission.lesson.type === LessonType.COMPOSER && Array.isArray(submission.answers) && (
              <div className="mt-4 space-y-4">
                {submission.answers.map((answer: any, index: number) => {
                  const isCorrect = Boolean(answer?.isCorrect);
                  return (
                    <div
                      key={`${answer?.index ?? index}`}
                      className={cn(
                        "rounded-md border p-4",
                        isCorrect
                          ? "border-emerald-400/60 bg-emerald-900/40 text-emerald-100"
                          : "border-rose-400/60 bg-rose-900/40 text-rose-100"
                      )}
                    >
                      <p className="text-sm font-semibold uppercase text-slate-400">
                        Composer Q{index + 1}
                      </p>
                      <p className="text-base text-slate-100">{answer?.prompt || 'Composer prompt'}</p>
                      <div className="mt-3 grid gap-2 text-sm text-slate-100 sm:grid-cols-2">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-400">Selected</p>
                          <p className="font-semibold">{answer?.selectedWord || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-400">Correct word</p>
                          <p className="font-semibold">{answer?.correctWord || '—'}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              )}
              
              {submission.lesson.type === LessonType.LYRIC && lyricLessonConfig && (
              <div className="mt-4 space-y-3 rounded-lg border bg-slate-50 p-4">
                {lyricExistingAttempt ? (
                  <>
                    <p className="text-sm font-semibold text-foreground">Filled blanks (read-only)</p>
                    <div className="max-h-[520px] space-y-3 overflow-y-auto rounded-md border bg-card p-3 text-sm text-foreground">
                      {lyricPreparedLines.map((line, index) => {
                        const answers = (lyricExistingAttempt.answers ?? {}) as Record<string, string[]>;
                        const replacements = answers[line.id] ?? [];
                        const displayIndex = index + 1;

                        return (
                          <div key={line.id} className="rounded-md border border-slate-200 p-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                            <div className="flex items-center justify-between text-xs text-slate-500">
                              <div className="flex items-center gap-3">
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 font-semibold text-slate-600">
                                  {displayIndex}
                                </span>
                                <span>
                                  {formatDuration(line.startTime)} → {formatDuration(line.endTime)}
                                </span>
                              </div>
                            </div>
                            <div className="mt-3 text-base leading-relaxed text-slate-900">
                              {line.tokens.map((token, tokenIndex) => {
                                if (!token.hidden || token.answerIndex === null) {
                                  return <span key={`${line.id}-${tokenIndex}`}>{token.value}</span>;
                                }

                                const replacement = replacements[token.answerIndex] ?? '';
                                const expected = line.hiddenWords[token.answerIndex] ?? '';
                                const isMatch = sanitizeWord(replacement) === sanitizeWord(expected);

                                return (
                                  <span key={`${line.id}-${tokenIndex}`} className="mx-1 inline-block">
                                    <span
                                      className={`inline-flex min-w-[80px] items-center justify-center rounded-md border px-2 py-1 text-sm ${
                                        isMatch
                                          ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                                          : 'border-amber-300 bg-amber-50 text-amber-800'
                                      }`}
                                    >
                                      {replacement && replacement.trim() ? replacement : '____'}
                                    </span>
                                    {!isMatch && expected && (
                                      <span className="mt-1 block text-xs text-amber-700">{expected}</span>
                                    )}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                          );
                        })}
                      </div>
                      {typeof lyricExistingAttempt?.readModeSwitchesUsed === 'number' && (
                        <p className="text-xs text-slate-600">
                          Read-along switches used: {lyricExistingAttempt.readModeSwitchesUsed}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-slate-600">
                      The student hasn&apos;t submitted any lyric attempts yet.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border bg-card p-6 shadow-md">
            <GradingForm assignment={serializableSubmission} />
          </div>
        </div>
      )}
      
      <div className="mt-8">
        <Accordion type="single" collapsible>
            <AccordionItem value="lesson-content">
                <AccordionTrigger>View Original Lesson Content</AccordionTrigger>
                <AccordionContent>
                    <div className="p-4 border rounded-md bg-muted/50">
                        <LessonContentView lesson={serializableSubmission.lesson} />
                        {submission.lesson.type === LessonType.STANDARD && standardQuestions.length > 0 && (
                          <div className="mt-6 space-y-3">
                            <h3 className="text-lg font-semibold text-foreground">Lesson Questions</h3>
                            {standardQuestions.map((item, index) => (
                              <div key={`standard-question-${index}`} className="rounded-md border border-border bg-card p-3 shadow-sm">
                                <p className="text-xs font-semibold uppercase text-muted-foreground">Q{index + 1}</p>
                                <p className="text-base font-medium text-foreground">{item.question}</p>
                                {item.expectedAnswer && (
                                  <p className="mt-2 text-sm text-muted-foreground">
                                    <span className="font-semibold text-foreground">Expected:</span> {item.expectedAnswer}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {submission.lesson.type === LessonType.MULTI_CHOICE && multiChoiceQuestions.length > 0 && (
                          <div className="mt-6 space-y-3">
                            <h3 className="text-lg font-semibold text-foreground">Lesson Questions</h3>
                            {multiChoiceQuestions.map((question, index) => (
                              <div key={question.id} className="rounded-md border border-border bg-card p-3 shadow-sm">
                                <p className="text-xs font-semibold uppercase text-muted-foreground">Q{index + 1}</p>
                                <p className="text-base font-medium text-foreground">{question.question}</p>
                                <div className="mt-2 space-y-2 text-sm">
                                  {question.options.map((option) => {
                                    const isCorrect = option.isCorrect;
                                    return (
                                      <div
                                        key={option.id}
                                        className={cn(
                                          "rounded-md border px-2 py-1",
                                          isCorrect
                                            ? "border-emerald-400/60 bg-emerald-900/40 text-emerald-100"
                                            : "border-slate-700 bg-slate-900/70 text-slate-200"
                                        )}
                                      >
                                        {option.text}
                                        {isCorrect ? " (correct)" : ""}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {submission.lesson.type === LessonType.NEWS_ARTICLE && newsArticleHtml && (
                          <div className="mt-6 space-y-3">
                            <h3 className="text-lg font-semibold text-foreground">Article</h3>
                            <div className="rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50 via-stone-50 to-amber-100/60 p-4 shadow-[0_18px_45px_rgba(120,53,15,0.08)] text-stone-900">
                              <p className="text-xs uppercase tracking-[0.3em] text-amber-700/80">
                                LessonHub Times
                              </p>
                              <h4 className="mt-2 text-2xl font-semibold text-stone-900">
                                {serializableSubmission.lesson.title}
                              </h4>
                              {serializableSubmission.lesson.lesson_preview && (
                                <p className="mt-2 text-sm text-stone-700">
                                  {serializableSubmission.lesson.lesson_preview}
                                </p>
                              )}
                            </div>
                            <div
                              className="rounded-3xl border border-stone-200 bg-stone-50/90 p-6 shadow-[0_22px_60px_rgba(24,24,24,0.08)] before:absolute before:inset-0 before:-z-10 before:rounded-3xl before:bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.18),_transparent_55%)] prose prose-stone max-w-none font-serif text-stone-800"
                              dangerouslySetInnerHTML={{ __html: newsArticleHtml }}
                            />
                          </div>
                        )}
                        {submission.lesson.type === LessonType.COMPOSER && submission.lesson.composerConfig && (
                          <div className="mt-6 space-y-3">
                            <h3 className="text-lg font-semibold text-foreground">Composer Setup</h3>
                            <div className="rounded-md border border-border bg-card p-3 shadow-sm">
                              <p className="text-xs font-semibold uppercase text-muted-foreground">Hidden sentence</p>
                              <p className="text-base font-medium text-foreground">
                                {submission.lesson.composerConfig.hiddenSentence}
                              </p>
                            </div>
                            <div className="space-y-3">
                              {(submission.lesson.composerConfig.questionBank as any[]).map((question, index) => (
                                <div key={question.id ?? index} className="rounded-md border border-border bg-card p-3 shadow-sm">
                                  <p className="text-xs font-semibold uppercase text-muted-foreground">Q{index + 1}</p>
                                  <p className="text-base font-medium text-foreground">{question.prompt}</p>
                                  <p className="mt-2 text-sm text-muted-foreground">
                                    <span className="font-semibold text-foreground">Answer:</span> {question.answer}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {submission.lesson.type === LessonType.FLASHCARD && flashcards.length > 0 && (
                          <div className="mt-6 space-y-3">
                            <h3 className="text-lg font-semibold text-foreground">Flashcard Deck</h3>
                            {flashcards.map(card => (
                              <div key={card.id} className="rounded-md border border-border bg-card p-3 shadow-sm">
                                <div>
                                  <p className="text-xs font-semibold uppercase text-muted-foreground">Front</p>
                                  <p className="text-base font-medium text-slate-100">{card.term}</p>
                                  {card.termImageUrl && (
                                    <div className="mt-2">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={card.termImageUrl}
                                        alt={`Flashcard term ${card.term}`}
                                        className="h-auto w-full max-w-sm rounded-md border object-cover"
                                      />
                                    </div>
                                  )}
                                </div>
                                <div className="mt-4">
                                  <p className="text-xs font-semibold uppercase text-slate-400">Back</p>
                                  <p className="text-base text-slate-100">{card.definition}</p>
                                  {card.definitionImageUrl && (
                                    <div className="mt-2">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={card.definitionImageUrl}
                                        alt={`Flashcard definition ${card.term}`}
                                        className="h-auto w-full max-w-sm rounded-md border object-cover"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {submission.lesson.type === LessonType.LEARNING_SESSION && learningSessionCards.length > 0 && (
                          <div className="mt-6">
                            <h3 className="text-lg font-semibold text-foreground">Learning Session</h3>
                            <LearningSessionPlayer cards={learningSessionCards} lessonTitle={submission.lesson.title} />
                          </div>
                        )}
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
  const parseDraftAnswers = (value: unknown): Record<string, string[]> | null => {
    if (!value || typeof value !== 'object') return null;
    const result: Record<string, string[]> = {};
    const entries = Object.entries(value as Record<string, unknown>);
    let hasEntries = false;
    entries.forEach(([key, raw]) => {
      if (!Array.isArray(raw)) return;
      const arr = raw.every(item => typeof item === 'string')
        ? (raw as string[])
        : raw.map(item => (item === null || item === undefined ? '' : String(item)));
      result[key] = arr;
      hasEntries = true;
    });
    return hasEntries ? result : null;
  };
