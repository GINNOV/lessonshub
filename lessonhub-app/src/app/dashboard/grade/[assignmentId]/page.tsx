// file: src/app/dashboard/grade/[assignmentId]/page.tsx
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getSubmissionForGrading } from "@/actions/lessonActions";
import { LessonType, Role } from "@prisma/client";
import GradingForm from "@/app/components/GradingForm";
import LessonContentView from "@/app/components/LessonContentView";
import LyricLessonPlayer from "@/app/components/LyricLessonPlayer";
import type { LyricLine, LyricLessonSettings } from "@/app/components/LyricLessonEditor";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type MultiChoiceAnswer = {
  questionId: string;
  selectedAnswerId: string | null;
  isCorrect: boolean | null;
};

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

  const parseMultiChoiceAnswers = (): Record<string, MultiChoiceAnswer> => {
    if (submission.lesson.type !== LessonType.MULTI_CHOICE) return {};
    const raw = submission.answers;
    if (!raw) return {};

    const record: Record<string, MultiChoiceAnswer> = {};

    const toBoolean = (value: unknown): boolean | null => {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'number') {
        if (value > 0) return true;
        if (value < 0) return false;
        return null;
      }
      if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (['correct', 'right', 'true', 'yes', 'y', '1', 'pass'].includes(normalized)) return true;
        if (['incorrect', 'wrong', 'false', 'no', 'n', '0', 'fail'].includes(normalized)) return false;
      }
      return null;
    };

    const extractSelectedValue = (value: unknown): unknown => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const obj = value as Record<string, unknown>;
        const candidate =
          obj.id ??
          obj.value ??
          obj.optionId ??
          obj.option_id ??
          obj.selectedAnswerId ??
          obj.selected_answer_id ??
          obj.answerId ??
          obj.answer_id ??
          obj.choice;
        if (typeof candidate === 'string' || typeof candidate === 'number') {
          return candidate;
        }
      }
      return value;
    };

    const ensureEntry = (
      questionId: string | undefined,
      selected: unknown,
      correctness: unknown,
      fallbackIndex?: number
    ) => {
      const fallbackId =
        typeof fallbackIndex === 'number'
          ? multiChoiceQuestions[fallbackIndex]?.id
          : undefined;
      const resolvedId = questionId ?? fallbackId;
      if (!resolvedId) return;

      const targets = new Set<string>([resolvedId]);
      if (fallbackId && fallbackId !== resolvedId) {
        targets.add(fallbackId);
      }

      const extractedSelection = (() => {
        if (selected === undefined) return undefined;
        const value = extractSelectedValue(selected);
        if (value === null) return null;
        if (typeof value === 'string') return value;
        if (typeof value === 'number') return String(value);
        return undefined;
      })();
      const boolValue = toBoolean(correctness);

      targets.forEach(id => {
        if (!record[id]) {
          record[id] = {
            questionId: id,
            selectedAnswerId: null,
            isCorrect: null,
          };
        }
        if (extractedSelection !== undefined) {
          record[id].selectedAnswerId = extractedSelection;
        }
        if (boolValue !== null) {
          record[id].isCorrect = boolValue;
        }
      });
    };

    const normalise = (value: unknown, fallbackIndex?: number) => {
      if (value === null || value === undefined) return;
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return;
        try {
          normalise(JSON.parse(trimmed), fallbackIndex);
          return;
        } catch {
          if (trimmed.includes(':')) {
            const [rawQuestionId, rawSelected] = trimmed.split(':', 2);
            const selectedValue = rawSelected ?? null;
            ensureEntry(rawQuestionId || undefined, selectedValue, null, fallbackIndex);
          }
          return;
        }
      }
      if (Array.isArray(value)) {
        if (value.length === 0) return;
        if (value.length <= 3 && (typeof value[0] === 'string' || typeof value[0] === 'number' || value[0] === null || value[0] === undefined)) {
          const [maybeQuestionId, maybeSelected, maybeCorrect] = value;
          const qid = typeof maybeQuestionId === 'string' ? maybeQuestionId : undefined;
          ensureEntry(qid, maybeSelected, maybeCorrect, fallbackIndex);
          return;
        }
        value.forEach((item, index) => {
          normalise(item, index);
        });
        return;
      }
      if (typeof value === 'object') {
        const obj = value as Record<string, unknown>;
        if (Object.keys(obj).length === 0) return;

        const questionIdCandidate = [
          obj.questionId,
          obj.question_id,
          obj.id,
          obj.promptId,
          obj.prompt_id,
          obj.key,
          obj.qid,
        ].find((candidate): candidate is string => typeof candidate === 'string');

        const rawSelectedCandidate = [
          obj.selectedAnswerId,
          obj.selected_answer_id,
          obj.answerId,
          obj.answer_id,
          obj.optionId,
          obj.option_id,
          obj.selectedOption,
          obj.selected_option,
          obj.selected,
          obj.value,
          obj.choice,
          obj.response,
        ].find((candidate) => candidate !== undefined);

        const correctnessCandidate = [
          obj.isCorrect,
          obj.correct,
          obj.is_correct,
          obj.wasCorrect,
          obj.result,
          obj.status,
          obj.outcome,
          obj.passed,
        ].find((candidate) => candidate !== undefined);

        if (questionIdCandidate || rawSelectedCandidate !== undefined || correctnessCandidate !== undefined) {
          ensureEntry(
            questionIdCandidate,
            rawSelectedCandidate,
            correctnessCandidate,
            fallbackIndex
          );
          return;
        }

        Object.entries(obj).forEach(([key, val]) => {
          if (val && typeof val === 'object') {
            normalise({ questionId: key, ...(val as Record<string, unknown>) }, fallbackIndex);
          } else {
            ensureEntry(key, val, undefined, fallbackIndex);
          }
        });
        return;
      }
      if (typeof value === 'number' || typeof value === 'boolean') {
        ensureEntry(undefined, value, value, fallbackIndex);
      }
    };

    normalise(raw);
    return record;
  };

  const flashcardAnswers = parseFlashcardAnswers();
  const correctCount = flashcardAnswers ? Object.values(flashcardAnswers).filter(a => a === 'correct').length : 0;
  const incorrectCount = flashcardAnswers ? Object.values(flashcardAnswers).filter(a => a === 'incorrect').length : 0;
  const multiChoiceAnswers = parseMultiChoiceAnswers();
  const multiChoiceDetails = multiChoiceQuestions.map((question, index) => {
    const answer = multiChoiceAnswers[question.id];
    const selectedOption = answer?.selectedAnswerId
      ? question.options.find(option => option.id === answer.selectedAnswerId) ?? null
      : null;
    const correctOption = question.options.find(option => option.isCorrect) ?? null;
    let isCorrect: boolean | null = null;
    if (selectedOption && correctOption) {
      isCorrect = selectedOption.id === correctOption.id;
    } else if (typeof answer?.isCorrect === 'boolean') {
      isCorrect = answer.isCorrect;
    }
    return {
      question,
      index,
      answer,
      selectedOption,
      correctOption,
      isCorrect,
    };
  });
  const multiChoiceSummary = multiChoiceDetails.reduce(
    (acc, detail) => {
      if (detail.selectedOption && detail.isCorrect === true) {
        acc.correct += 1;
      } else if (detail.selectedOption) {
        acc.incorrect += 1;
      } else if (detail.answer?.selectedAnswerId) {
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

  return (
    <div>
      <Button variant="link" asChild className="mb-4 pl-0">
        <Link href={`/dashboard/submissions/${submission.lessonId}`}>
          &larr; Back to Submissions
        </Link>
      </Button>
      <h1 className="text-3xl font-bold">Grade Submission</h1>
      <p className="mt-1 text-gray-600">
        Student: {submission.student.name || submission.student.email}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-2">
        <div className="space-y-6 rounded-lg border bg-white p-6 shadow-md">
          <div>
            <h2 className="border-b pb-2 text-xl font-semibold">
              Student&apos;s Response
            </h2>

            {submission.lesson.type === LessonType.FLASHCARD && (
              <div className="mt-4 space-y-3">
                {flashcards.length > 0 ? (
                  <>
                    <div className="flex justify-around rounded-md bg-gray-50 p-3">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">{correctCount}</p>
                        <p className="text-sm text-gray-500">Marked Correct</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-red-600">{incorrectCount}</p>
                        <p className="text-sm text-gray-500">Marked Incorrect</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {flashcards.map(flashcard => {
                        const result = flashcardAnswers?.[flashcard.id] ?? null;
                        return (
                          <div
                            key={flashcard.id}
                            className={cn(
                              "space-y-3 rounded-md border p-3 transition-colors",
                              result === 'correct' && 'border-green-200 bg-green-50',
                              result === 'incorrect' && 'border-red-200 bg-red-50'
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <div className="max-w-md">
                                <p className="text-sm font-semibold uppercase text-gray-500">Front</p>
                                <p className="text-base font-semibold text-gray-900">{flashcard.term}</p>
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
                                <div className="flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
                                  <CheckCircle2 className="h-4 w-4" />
                                  <span>Right</span>
                                </div>
                              ) : result === 'incorrect' ? (
                                <div className="flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700">
                                  <XCircle className="h-4 w-4" />
                                  <span>Wrong</span>
                                </div>
                              ) : (
                                <div className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-500">
                                  Not Reviewed
                                </div>
                              )}
                            </div>
                            <div className="max-w-md">
                              <p className="text-sm font-semibold uppercase text-gray-500">Back</p>
                              <p className="text-base text-gray-800">{flashcard.definition}</p>
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
                  <p className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
                    This lesson does not have any flashcards configured yet.
                  </p>
                )}
              </div>
            )}

            {submission.lesson.type === LessonType.MULTI_CHOICE && (
              <div className="mt-4 space-y-3">
                {multiChoiceDetails.length > 0 ? (
                  <>
                    <div className="flex flex-wrap justify-around gap-4 rounded-md bg-gray-50 p-3">
                      <div className="min-w-[90px] text-center">
                        <p className="text-2xl font-bold text-green-600">{multiChoiceSummary.correct}</p>
                        <p className="text-sm text-gray-500">Correct</p>
                      </div>
                      <div className="min-w-[90px] text-center">
                        <p className="text-2xl font-bold text-red-600">{multiChoiceSummary.incorrect}</p>
                        <p className="text-sm text-gray-500">Incorrect</p>
                      </div>
                      <div className="min-w-[90px] text-center">
                        <p className="text-2xl font-bold text-gray-600">{multiChoiceUnanswered}</p>
                        <p className="text-sm text-gray-500">Unanswered</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {multiChoiceDetails.map(detail => {
                        const { question, index: questionIndex, selectedOption, correctOption, isCorrect, answer } = detail;
                        const hasSelection = Boolean(
                          selectedOption ||
                          answer?.selectedAnswerId ||
                          typeof answer?.isCorrect === 'boolean'
                        );
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
                          statusLabel === 'Correct' && 'border-green-200 bg-green-50 text-green-700',
                          statusLabel === 'Incorrect' && 'border-red-200 bg-red-50 text-red-700',
                          statusLabel === 'No answer' && 'border-gray-200 bg-gray-50 text-gray-600'
                        );
                        return (
                          <div key={question.id} className="space-y-3 rounded-md border p-4">
                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                              <div>
                                <p className="text-sm font-semibold uppercase text-gray-500">Question {questionIndex + 1}</p>
                                <p className="text-base text-gray-900">{question.question}</p>
                              </div>
                              {statusLabel && (
                                <Badge variant="outline" className={statusBadgeClasses}>
                                  {statusLabel}
                                </Badge>
                              )}
                            </div>
                            <div className="space-y-2">
                              {question.options.map(option => {
                                const isSelected = Boolean(selectedOption && option.id === selectedOption.id);
                                const isCorrectOption = Boolean(correctOption && option.id === correctOption.id);
                                const optionClasses = cn(
                                  "flex flex-col gap-2 rounded-md border p-3 text-sm transition-colors md:flex-row md:items-center md:justify-between",
                                  isSelected && isCorrect === true && "border-green-500 bg-green-50",
                                  isSelected && isCorrect !== true && "border-red-500 bg-red-50",
                                  !isSelected && isCorrectOption && "border-green-200 bg-green-50",
                                  !isSelected && !isCorrectOption && "border-gray-200 bg-white"
                                );
                                return (
                                  <div key={option.id} className={optionClasses}>
                                    <span className="text-gray-800">{option.text}</span>
                                    <div className="flex flex-wrap gap-2">
                                      {isSelected && (
                                        <span
                                          className={cn(
                                            "rounded-full px-2 py-1 text-xs font-semibold",
                                            isCorrect === true ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800"
                                          )}
                                        >
                                          Your selection
                                        </span>
                                      )}
                                      {isCorrectOption && (
                                        <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
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
                  <p className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
                    This lesson does not include any multiple choice questions yet.
                  </p>
                )}
              </div>
            )}
            
            {submission.lesson.type === LessonType.STANDARD && (
              <div className="mt-4 space-y-6">
                {(submission.lesson.questions as string[])?.map(
                  (question, index) => {
                    const studentAnswers = submission.answers as string[] | null;
                    return (
                      <div key={index}>
                        <p className="rounded-md border bg-gray-50 p-3 font-semibold shadow-sm">
                          Q{index + 1}❓ {question}
                        </p>
                        <blockquote className="mt-2 rounded-md border-l-4 border-blue-300 bg-blue-50 p-3 text-gray-800">
                          {studentAnswers?.[index] || (
                            <span className="italic text-gray-500">
                              No answer provided.
                            </span>
                          )}
                        </blockquote>
                      </div>
                    );
                  }
                )}
              </div>
            )}
            {submission.lesson.type === LessonType.LYRIC && lyricLessonConfig && (
              <>
                {lyricExistingAttempt ? (
                  <div className="mt-4 rounded-lg border bg-slate-50 p-4">
                    <LyricLessonPlayer
                      assignmentId={serializableSubmission.id}
                      lessonId={serializableSubmission.lesson.id}
                      audioUrl={lyricLessonConfig.audioUrl}
                      lines={lyricLessonConfig.lines as LyricLine[]}
                      settings={lyricLessonConfig.settings as LyricLessonSettings | null}
                      status={serializableSubmission.status}
                      existingAttempt={lyricExistingAttempt}
                      timingSourceUrl={lyricLessonConfig.timingSourceUrl ?? null}
                      lrcUrl={lyricLessonConfig.lrcUrl ?? null}
                      draftState={{
                        answers: (serializableSubmission as any).lyricDraftAnswers ?? null,
                        mode:
                          serializableSubmission.lyricDraftMode === 'read' ||
                          serializableSubmission.lyricDraftMode === 'fill'
                            ? serializableSubmission.lyricDraftMode
                            : null,
                        readModeSwitches: serializableSubmission.lyricDraftReadSwitches ?? null,
                        updatedAt: serializableSubmission.lyricDraftUpdatedAt
                          ? serializableSubmission.lyricDraftUpdatedAt.toISOString()
                          : null,
                      }}
                    />
                    {typeof lyricExistingAttempt?.readModeSwitchesUsed === 'number' && (
                      <p className="mt-3 text-sm text-slate-600">
                        Read-along switches used: {lyricExistingAttempt.readModeSwitchesUsed}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="mt-4 rounded-md border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
                    The student hasn&apos;t submitted any lyric attempts yet.
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        <div className="rounded-lg border bg-white p-6 shadow-md">
          <GradingForm assignment={serializableSubmission} />
        </div>
      </div>
      
      <div className="mt-8">
        <Accordion type="single" collapsible>
            <AccordionItem value="lesson-content">
                <AccordionTrigger>View Original Lesson Content</AccordionTrigger>
                <AccordionContent>
                    <div className="p-4 border rounded-md bg-gray-50">
                        <LessonContentView lesson={serializableSubmission.lesson} />
                        {submission.lesson.type === LessonType.FLASHCARD && flashcards.length > 0 && (
                          <div className="mt-6 space-y-3">
                            <h3 className="text-lg font-semibold text-gray-800">Flashcard Deck</h3>
                            {flashcards.map(card => (
                              <div key={card.id} className="rounded-md border border-gray-200 bg-white p-3 shadow-sm">
                                <div>
                                  <p className="text-xs font-semibold uppercase text-gray-500">Front</p>
                                  <p className="text-base font-medium text-gray-900">{card.term}</p>
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
                                  <p className="text-xs font-semibold uppercase text-gray-500">Back</p>
                                  <p className="text-base text-gray-800">{card.definition}</p>
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
