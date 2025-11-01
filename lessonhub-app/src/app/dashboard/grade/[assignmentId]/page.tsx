// file: src/app/dashboard/grade/[assignmentId]/page.tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getSubmissionForGrading } from "@/actions/lessonActions";
import { LessonType, Role } from "@prisma/client";
import GradingForm from "@/app/components/GradingForm";
import LessonContentView from "@/app/components/LessonContentView";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { marked } from "marked";
import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

type MultiChoiceAnswer = {
  questionId: string;
  selectedAnswerId: string;
  isCorrect: boolean;
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

  const serializableSubmission = {
    ...submission,
    lesson: {
        ...submission.lesson,
        price: submission.lesson.price.toNumber(),
    }
  };

  const parseFlashcardAnswers = (): Record<string, 'correct' | 'incorrect'> | null => {
    if (submission.lesson.type !== LessonType.FLASHCARD) return null;
    const raw = submission.answers;
    if (!raw) return null;
    const normalise = (value: unknown): Record<string, 'correct' | 'incorrect'> | null => {
      if (!value) return null;
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? parsed as Record<string, 'correct' | 'incorrect'>
            : null;
        } catch {
          return null;
        }
      }
      if (typeof value === 'object' && !Array.isArray(value)) {
        try {
          const plain = JSON.parse(JSON.stringify(value));
          return plain && typeof plain === 'object' && !Array.isArray(plain)
            ? plain as Record<string, 'correct' | 'incorrect'>
            : null;
        } catch {
          return null;
        }
      }
      return null;
    };
    return normalise(raw);
  };

  const flashcardAnswers = parseFlashcardAnswers();
  const correctCount = flashcardAnswers ? Object.values(flashcardAnswers).filter(a => a === 'correct').length : 0;
  const incorrectCount = flashcardAnswers ? Object.values(flashcardAnswers).filter(a => a === 'incorrect').length : 0;

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
                {flashcardAnswers ? (
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
                      {submission.lesson.flashcards.map(flashcard => {
                        const result = flashcardAnswers[flashcard.id];
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
                              <div>
                                <p className="text-sm font-semibold uppercase text-gray-500">Front</p>
                                <p className="text-base font-semibold text-gray-900">{flashcard.term}</p>
                                {flashcard.termImageUrl && (
                                  <div className="mt-2">
                                    <Image
                                      src={flashcard.termImageUrl}
                                      alt={`Flashcard term ${flashcard.term}`}
                                      width={160}
                                      height={120}
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
                            <div>
                              <p className="text-sm font-semibold uppercase text-gray-500">Back</p>
                              <p className="text-base text-gray-800">{flashcard.definition}</p>
                              {flashcard.definitionImageUrl && (
                                <div className="mt-2">
                                  <Image
                                    src={flashcard.definitionImageUrl}
                                    alt={`Flashcard definition ${flashcard.term}`}
                                    width={160}
                                    height={120}
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
                    This submission does not include any flashcard results yet.
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
                        {submission.lesson.type === LessonType.FLASHCARD && submission.lesson.flashcards.length > 0 && (
                          <div className="mt-6 space-y-3">
                            <h3 className="text-lg font-semibold text-gray-800">Flashcard Deck</h3>
                            {submission.lesson.flashcards.map(card => (
                              <div key={card.id} className="rounded-md border border-gray-200 bg-white p-3 shadow-sm">
                                <div>
                                  <p className="text-xs font-semibold uppercase text-gray-500">Front</p>
                                  <p className="text-base font-medium text-gray-900">{card.term}</p>
                                  {card.termImageUrl && (
                                    <div className="mt-2">
                                      <Image
                                        src={card.termImageUrl}
                                        alt={`Flashcard term ${card.term}`}
                                        width={200}
                                        height={140}
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
                                      <Image
                                        src={card.definitionImageUrl}
                                        alt={`Flashcard definition ${card.term}`}
                                        width={200}
                                        height={140}
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
