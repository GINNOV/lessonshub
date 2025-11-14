// file: src/app/assignments/[assignmentId]/page.tsx
import { randomUUID } from "node:crypto";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getAssignmentById, recordLessonUsageForLatestLogin } from "@/actions/lessonActions";
import LessonResponseForm from "@/app/components/LessonResponseForm";
import LessonContentView from "@/app/components/LessonContentView";
import MultiChoicePlayer from "@/app/components/MultiChoicePlayer";
import FlashcardPlayer from "@/app/components/FlashcardPlayer";
import LyricLessonPlayer from "@/app/components/LyricLessonPlayer";
import LearningSessionPlayer from "@/app/components/LearningSessionPlayer";
import { marked } from "marked";
import { AssignmentStatus, LessonType } from "@prisma/client";
import Confetti from "@/app/components/Confetti";
import { cn } from "@/lib/utils";
import LocaleDate from "@/app/components/LocaleDate";
import { Badge } from "@/components/ui/badge";
import { Check, X, CheckCircle2, XCircle, GraduationCap } from "lucide-react";
import Rating from "@/app/components/Rating";
import { Button } from "@/components/ui/button";
import type { LyricLine, LyricLessonSettings } from "@/app/components/LyricLessonEditor";

marked.setOptions({
  gfm: true,
  breaks: true,
});
// --- SVG Icons ---
// Removed inline icons; using shared content view for attachments

const getGradeBackground = (score: number | null) => {
  if (score === null) return "bg-gray-100";
  if (score >= 8) return "bg-gradient-to-br from-green-100 to-green-200";
  if (score >= 6) return "bg-gradient-to-br from-blue-100 to-blue-200";
  if (score >= 4) return "bg-gradient-to-br from-yellow-100 to-yellow-200";
  return "bg-gradient-to-br from-red-100 to-red-200";
};

export default async function AssignmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ assignmentId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session) {
    redirect("/signin");
  }

  const { assignmentId } = await params;
  const query = searchParams ? await searchParams : {};
  const practiceParamRaw = query?.practice;
  const practiceParam = Array.isArray(practiceParamRaw) ? practiceParamRaw[0] : practiceParamRaw;
  const assignment = await getAssignmentById(assignmentId, session.user.id);

  if (!assignment) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold">Assignment not found</h1>
        <p>This assignment may not exist or you may not have permission to view it.</p>
      </div>
    );
  }
  if (session.user.id === assignment.studentId) {
    await recordLessonUsageForLatestLogin(assignment.studentId, assignment.lessonId);
  }
  
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

  const lyricAttempts = (assignment.lesson.lyricAttempts ?? []).map((attempt) => ({
    id: attempt.id,
    scorePercent: attempt.scorePercent ? Number(attempt.scorePercent.toString()) : null,
    timeTakenSeconds: attempt.timeTakenSeconds ?? null,
    answers: attempt.answers as Record<string, string[]> | null,
    readModeSwitchesUsed: typeof attempt.readModeSwitchesUsed === "number" ? attempt.readModeSwitchesUsed : null,
    createdAt: attempt.createdAt.toISOString(),
  }));

  const serializableAssignment = {
    ...assignment,
    lesson: {
      ...assignment.lesson,
      price: assignment.lesson.price.toNumber(),
      lyricConfig: assignment.lesson.lyricConfig
        ? {
            ...assignment.lesson.lyricConfig,
            lines: normalizeLyricLines(assignment.lesson.lyricConfig.lines),
            settings: (assignment.lesson.lyricConfig.settings as LyricLessonSettings | null) ?? null,
          }
        : null,
      lyricAttempts,
    },
    answers: assignment.answers as any,
    lyricDraftAnswers: ((): Record<string, string[]> | null => {
      if (!assignment.lyricDraftAnswers || typeof assignment.lyricDraftAnswers !== 'object') return null;
      const result: Record<string, string[]> = {};
      let hasEntries = false;
      Object.entries(assignment.lyricDraftAnswers as Record<string, unknown>).forEach(([key, raw]) => {
        if (!Array.isArray(raw)) return;
        const arr = raw.every(item => typeof item === 'string')
          ? (raw as string[])
          : raw.map(item => (item === null || item === undefined ? '' : String(item)));
        result[key] = arr;
        hasEntries = true;
      });
      return hasEntries ? result : null;
    })(),
    lyricDraftMode:
      assignment.lyricDraftMode === 'read' || assignment.lyricDraftMode === 'fill'
        ? assignment.lyricDraftMode
        : null,
    lyricDraftReadSwitches:
      typeof assignment.lyricDraftReadSwitches === 'number' ? assignment.lyricDraftReadSwitches : null,
    lyricDraftUpdatedAt: assignment.lyricDraftUpdatedAt,
  };

  const { lesson } = serializableAssignment;
  const practiceEligible =
    serializableAssignment.status === AssignmentStatus.GRADED &&
    (lesson.type === LessonType.MULTI_CHOICE || lesson.type === LessonType.FLASHCARD);
  const practiceModeRequested = practiceParam === "1" || practiceParam === "true";
  const practiceMode = practiceEligible && practiceModeRequested;
  const practiceToggleHref = practiceMode
    ? `/assignments/${serializableAssignment.id}`
    : `/assignments/${serializableAssignment.id}?practice=1`;
  const practiceExitHref = `/assignments/${serializableAssignment.id}`;

  const lessonPreviewHtml = lesson.lesson_preview ? await marked.parse(lesson.lesson_preview) : null;
  const contextHtml = lesson.context_text ? ((await marked.parse(lesson.context_text)) as string) : null;
  const notesHtml = lesson.notes ? ((await marked.parse(lesson.notes)) as string) : null;

  const showResponseArea = serializableAssignment.status === AssignmentStatus.PENDING;
  const showResultsArea = serializableAssignment.status === AssignmentStatus.GRADED || serializableAssignment.status === AssignmentStatus.FAILED;
  const isPastDue =
    serializableAssignment.status === AssignmentStatus.PENDING &&
    new Date(serializableAssignment.deadline).getTime() < Date.now();

  const isMultiChoice = lesson.type === LessonType.MULTI_CHOICE;
  const isFlashcard = lesson.type === LessonType.FLASHCARD;
  const isLyric = lesson.type === LessonType.LYRIC;
  const lyricAudioUrl = lesson.lyricConfig?.audioUrl ?? null;
  const isLearningSession = lesson.type === LessonType.LEARNING_SESSION;
  const showConfetti = serializableAssignment.score === 10;
  const teacherAnswerCommentsMap: Record<number, string> = (() => {
    const src = (serializableAssignment as any).teacherAnswerComments;
    if (!src) return {};
    if (Array.isArray(src)) {
      return src.reduce((acc: Record<number, string>, value, index) => {
        if (typeof value === "string" && value.trim()) {
          acc[index] = value.trim();
        }
        return acc;
      }, {});
    }
    if (typeof src === "object") {
      return Object.entries(src as Record<string, unknown>).reduce(
        (acc: Record<number, string>, [key, value]) => {
          if (typeof value === "string" && value.trim()) {
            const numericKey = Number(key);
            if (!Number.isNaN(numericKey)) {
              acc[numericKey] = value.trim();
            }
          }
          return acc;
        },
        {},
      );
    }
    return {};
  })();
  const lessonQuestions: string[] = Array.isArray(lesson.questions)
    ? lesson.questions.map((item): string => {
        if (typeof item === "string") return item;
        if (item === null || item === undefined) return "";
        return typeof item === "object" ? JSON.stringify(item) : String(item);
      })
    : [];
  const teacherCommentsBlock = serializableAssignment.teacherComments ? (
    <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <GraduationCap className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
      <div className="space-y-1">
        <p className="font-medium">Teacher&apos;s feedback</p>
        <p className="whitespace-pre-wrap">{serializableAssignment.teacherComments}</p>
      </div>
    </div>
  ) : null;
  
  return (
    <div className="mx-auto max-w-4xl rounded-lg bg-white p-8 shadow-md">
      {showConfetti && <Confetti />}

      <h1 className="mb-2 text-3xl font-bold">{lesson.title}</h1>
      <p className="mb-6 text-sm font-bold text-red-600">
        Deadline: <LocaleDate date={serializableAssignment.deadline} />
      </p>
      {isPastDue && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">Deadline missed</p>
          <p className="mt-1">
            You didn&apos;t submit this lesson before the due date. The material remains visible so you can review it, but submitting answers is disabled.
          </p>
        </div>
      )}

      {showResultsArea && (
        <div className="mb-8">
            <h2 className="mb-4 text-2xl font-bold text-gray-800">Your Results</h2>
            <div className={cn("p-6 rounded-lg", getGradeBackground(serializableAssignment.score))}>
                <div className="flex justify-between items-center">
                    <div>
                        <p className="text-sm font-medium text-gray-600">Status</p>
                        <Badge variant={serializableAssignment.status === 'GRADED' ? 'default' : 'destructive'}>
                            {serializableAssignment.status}
                        </Badge>
            </div>
            <div>
                <p className="text-sm font-medium text-gray-600 text-right">Score</p>
                <p className="text-3xl font-bold text-gray-800">
                    {serializableAssignment.score !== null ? `${serializableAssignment.score}/10` : 'N/A'}
                </p>
            </div>
        </div>
        {practiceEligible && (
          <div className="mt-4 flex flex-wrap gap-3">
            {!practiceMode ? (
              <Button asChild size="sm">
                <Link href={practiceToggleHref}>Take the test again</Link>
              </Button>
            ) : (
              <Button asChild size="sm" variant="outline">
                <Link href={practiceToggleHref}>Exit practice mode</Link>
              </Button>
            )}
          </div>
        )}
         {serializableAssignment.rating && (
            <div className="mt-4 border-t border-gray-300 pt-4">
                <h3 className="text-md font-semibold text-gray-700">Your Rating:</h3>
                <div className="mt-1">
                  <Rating initialRating={serializableAssignment.rating} readOnly={true} starSize={20} />
                        </div>
                    </div>
                )}
            </div>
        </div>
      )}
      
      {lessonPreviewHtml && (
        <div className="mb-6 rounded-lg border bg-gray-50 p-4">
            <h2 className="text-xl font-semibold">👀 PREVIEW</h2>
            <div className="prose max-w-none mt-2" dangerouslySetInnerHTML={{ __html: lessonPreviewHtml as string }} />
        </div>
      )}

      {!isFlashcard && (
        <div className="my-6">
          <LessonContentView lesson={serializableAssignment.lesson} />
        </div>
      )}

      {showResponseArea ? (
        <div className="mt-8 border-t border-gray-200 pt-6">
          {!isFlashcard && notesHtml && (
            <div className="mb-4 rounded-lg border bg-gray-50 p-4 text-gray-800">
              <h3 className="text-lg font-semibold mb-1">Notes</h3>
              <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: notesHtml }} />
            </div>
          )}
          {!isFlashcard && !isLearningSession && (
            <h2 className="mb-4 text-2xl font-bold text-gray-800">Your Response</h2>
          )}
          {isFlashcard ? (
            <FlashcardPlayer assignment={serializableAssignment} isSubmissionLocked={isPastDue} />
          ) : isMultiChoice ? (
            <MultiChoicePlayer assignment={serializableAssignment} isSubmissionLocked={isPastDue} />
          ) : isLyric && lesson.lyricConfig ? (
            <LyricLessonPlayer
              assignmentId={serializableAssignment.id}
              studentId={serializableAssignment.studentId}
              lessonId={lesson.id}
              audioUrl={lyricAudioUrl}
              lines={lesson.lyricConfig.lines}
              settings={lesson.lyricConfig.settings}
              status={serializableAssignment.status}
              existingAttempt={lesson.lyricAttempts?.[0] ?? null}
              timingSourceUrl={lesson.lyricConfig.timingSourceUrl ?? null}
              lrcUrl={lesson.lyricConfig.lrcUrl ?? null}
              draftState={{
                answers: (serializableAssignment as any).lyricDraftAnswers ?? null,
                mode: (serializableAssignment as any).lyricDraftMode ?? null,
                readModeSwitches: (serializableAssignment as any).lyricDraftReadSwitches ?? null,
                updatedAt: (serializableAssignment as any).lyricDraftUpdatedAt ?? null,
              }}
            />
          ) : isLearningSession ? (
            <LearningSessionPlayer
              cards={lesson.learningSessionCards ?? []}
              lessonTitle={lesson.title}
            />
          ) : (
            <LessonResponseForm assignment={serializableAssignment} isSubmissionLocked={isPastDue} />
          )}
        </div>
      ) : (
        <div className="mt-8 border-t pt-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Review Your Submission</h2>
          {lesson.type === LessonType.STANDARD && (
             <div className="mt-2 space-y-4 rounded-lg border bg-gray-50 p-4">
                {Array.isArray(serializableAssignment.answers) && lessonQuestions.map((question, i) => {
                    const teacherComment = teacherAnswerCommentsMap[i];
                    return (
                      <div key={i} className="space-y-2">
                        <p className="text-sm font-semibold text-gray-600">Question {i + 1}: {question}</p>
                        <p className="prose prose-sm mt-1 border-l-2 pl-4 text-gray-800">{serializableAssignment.answers[i] || 'No answer provided.'}</p>
                        {teacherComment && (
                          <div className="mt-1 flex items-start gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
                            <GraduationCap className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
                            <p className="whitespace-pre-wrap">{teacherComment}</p>
                          </div>
                        )}
                      </div>
                    );
                })}
                {teacherCommentsBlock}
                {serializableAssignment.rating && (
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Your Rating</p>
                    <div className="mt-1">
                       <Rating initialRating={serializableAssignment.rating} readOnly={true} starSize={20} />
                    </div>
                  </div>
                )}
            </div>
          )}
          {lesson.type === LessonType.MULTI_CHOICE && Array.isArray(serializableAssignment.answers) && (
            <>
              <div className="space-y-6">
                {lesson.multiChoiceQuestions.map((q, i) => {
                  const studentAnswer = serializableAssignment.answers.find((a: any) => a.questionId === q.id);
                  return (
                    <div key={q.id} className="rounded-lg border p-4">
                      <p className="font-semibold">{i + 1}. {q.question}</p>
                      <div className="mt-2 space-y-2">
                        {q.options.map(opt => {
                          const isSelected = studentAnswer?.selectedAnswerId === opt.id;
                          const isCorrect = opt.isCorrect;
                          return (
                            <div key={opt.id} className={cn(
                              "flex items-center gap-2 rounded-md p-2",
                              isSelected && !isCorrect && "bg-red-100",
                              isCorrect && "bg-green-100"
                            )}>
                              {isSelected ? (isCorrect ? <Check className="h-5 w-5 text-green-600"/> : <X className="h-5 w-5 text-red-600"/>) : (isCorrect ? <Check className="h-5 w-5 text-green-600"/> : <div className="h-5 w-5"/>)}
                              <span className={cn(isSelected && "font-bold")}>{opt.text}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
              {teacherCommentsBlock}
            </>
          )}
          {lesson.type === LessonType.FLASHCARD && typeof serializableAssignment.answers === 'object' && serializableAssignment.answers !== null && (
            <>
              <div className="space-y-4">
                {lesson.flashcards.map((fc) => {
                  const studentPerformance = serializableAssignment.answers[fc.id];
                  return (
                    <div key={fc.id} className={cn("flex items-center justify-between rounded-lg border p-4",
                        studentPerformance === 'correct' ? 'bg-green-100' : 'bg-red-100'
                    )}>
                        <div>
                            <p className="font-semibold">{fc.term}</p>
                            <p className="text-sm text-gray-600">{fc.definition}</p>
                        </div>
                        {studentPerformance === 'correct' && (
                            <div className="flex items-center gap-1 text-green-600 font-semibold">
                                <CheckCircle2 className="h-5 w-5" />
                                <span>Right</span>
                            </div>
                        )}
                        {studentPerformance === 'incorrect' && (
                            <div className="flex items-center gap-1 text-red-600 font-semibold">
                                <XCircle className="h-5 w-5" />
                                <span>Wrong</span>
                            </div>
                        )}
                    </div>
                  )
                })}
              </div>
              {teacherCommentsBlock}
            </>
          )}
          {lesson.type === LessonType.LEARNING_SESSION && (
            <>
              <LearningSessionPlayer
                cards={lesson.learningSessionCards ?? []}
                lessonTitle={lesson.title}
              />
              {teacherCommentsBlock}
            </>
          )}
          {lesson.type === LessonType.LYRIC && lesson.lyricConfig && (
            <LyricLessonPlayer
              assignmentId={serializableAssignment.id}
              studentId={serializableAssignment.studentId}
              lessonId={lesson.id}
              audioUrl={lyricAudioUrl}
              lines={lesson.lyricConfig.lines}
              settings={lesson.lyricConfig.settings}
              status={serializableAssignment.status}
              existingAttempt={lesson.lyricAttempts?.[0] ?? null}
              timingSourceUrl={lesson.lyricConfig.timingSourceUrl ?? null}
              lrcUrl={lesson.lyricConfig.lrcUrl ?? null}
            />
          )}
        </div>
      )}
      {practiceMode && practiceEligible && (
        <div className="mt-10 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Practice Mode</h2>
              <p className="text-sm text-gray-600">
                Revisit the questions for extra practice. Your original grade stays the same.
              </p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href={practiceExitHref}>Done practicing</Link>
            </Button>
          </div>
          {lesson.type === LessonType.FLASHCARD ? (
            <FlashcardPlayer assignment={serializableAssignment as any} mode="practice" practiceExitHref={practiceExitHref} />
          ) : (
            <MultiChoicePlayer
              assignment={serializableAssignment as any}
              mode="practice"
              practiceExitHref={practiceExitHref}
            />
          )}
        </div>
      )}
    </div>
  );
}
