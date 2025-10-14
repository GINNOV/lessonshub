// file: src/app/assignments/[assignmentId]/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getAssignmentById } from "@/actions/lessonActions";
import LessonResponseForm from "@/app/components/LessonResponseForm";
import LessonContentView from "@/app/components/LessonContentView";
import MultiChoicePlayer from "@/app/components/MultiChoicePlayer";
import FlashcardPlayer from "@/app/components/FlashcardPlayer";
import { marked } from "marked";
import { AssignmentStatus, LessonType } from "@prisma/client";
import Confetti from "@/app/components/Confetti";
import { cn } from "@/lib/utils";
import LocaleDate from "@/app/components/LocaleDate";
import { Badge } from "@/components/ui/badge";
import { Check, X, CheckCircle2, XCircle, GraduationCap } from "lucide-react";
import Rating from "@/app/components/Rating";

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
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const session = await auth();
  if (!session) {
    redirect("/signin");
  }

  const { assignmentId } = await params;
  const assignment = await getAssignmentById(assignmentId, session.user.id);

  if (!assignment) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold">Assignment not found</h1>
        <p>This assignment may not exist or you may not have permission to view it.</p>
      </div>
    );
  }
  
  const serializableAssignment = {
    ...assignment,
    lesson: {
      ...assignment.lesson,
      price: assignment.lesson.price.toNumber(),
    },
    answers: assignment.answers as any,
  };

  const { lesson } = serializableAssignment;

  const lessonPreviewHtml = lesson.lesson_preview ? await marked.parse(lesson.lesson_preview) : null;
  const contextHtml = lesson.context_text ? ((await marked.parse(lesson.context_text)) as string) : null;

  const showResponseArea = serializableAssignment.status === AssignmentStatus.PENDING;
  const showResultsArea = serializableAssignment.status === AssignmentStatus.GRADED || serializableAssignment.status === AssignmentStatus.FAILED;

  const isMultiChoice = lesson.type === LessonType.MULTI_CHOICE;
  const isFlashcard = lesson.type === LessonType.FLASHCARD;
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
          {!isFlashcard && lesson.notes && (
            <div className="mb-4 rounded-lg border bg-gray-50 p-4 text-gray-800">
              <h3 className="text-lg font-semibold mb-1">Notes</h3>
              <p className="text-sm leading-relaxed">{lesson.notes}</p>
            </div>
          )}
          {!isFlashcard && <h2 className="mb-4 text-2xl font-bold text-gray-800">Your Response</h2>}
          {isFlashcard ? (
            <FlashcardPlayer assignment={serializableAssignment} />
          ) : isMultiChoice ? (
            <MultiChoicePlayer assignment={serializableAssignment} />
          ) : (
            <LessonResponseForm assignment={serializableAssignment} />
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
        </div>
      )}
    </div>
  );
}
