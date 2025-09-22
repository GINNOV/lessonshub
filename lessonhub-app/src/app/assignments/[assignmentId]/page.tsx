// file: src/app/assignments/[assignmentId]/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getAssignmentById } from "@/actions/lessonActions";
import LessonResponseForm from "@/app/components/LessonResponseForm";
import MultiChoicePlayer from "@/app/components/MultiChoicePlayer";
import FlashcardPlayer from "@/app/components/FlashcardPlayer";
import { marked } from "marked";
import { AssignmentStatus, LessonType } from "@prisma/client";
import Confetti from "@/app/components/Confetti";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import LocaleDate from "@/app/components/LocaleDate";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// --- SVG Icons ---
function InfoIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}
function PaperclipIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.59a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}
function EyeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

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

  const assignmentHtml = (await marked.parse(lesson.assignment_text ?? "")) as string;
  const showResponseArea = serializableAssignment.status === AssignmentStatus.PENDING;
  const showResultsArea = serializableAssignment.status === AssignmentStatus.GRADED || serializableAssignment.status === AssignmentStatus.FAILED;

  const isMultiChoice = lesson.type === LessonType.MULTI_CHOICE;
  const isFlashcard = lesson.type === LessonType.FLASHCARD;
  const showConfetti = serializableAssignment.score === 10;
  
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
                {serializableAssignment.teacherComments && (
                    <div className="mt-4 border-t border-gray-300 pt-4">
                        <h3 className="text-md font-semibold text-gray-700">Teacher&apos;s Feedback:</h3>
                        <div className="prose prose-sm mt-2 text-gray-600">
                            <p><em>&quot;{serializableAssignment.teacherComments}&quot;</em></p>
                        </div>
                    </div>
                )}
            </div>
        </div>
      )}
      
      <div className="mb-6 rounded-lg border bg-gray-50 p-4">
          <h2 className="text-xl font-semibold">👉🏼 INSTRUCTIONS</h2>
          <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: assignmentHtml }} />
      </div>

       {lesson.assignment_image_url && (
          <div className="my-4">
            <h2 className="text-sm font-semibold uppercase text-gray-500">
              Supporting Material
            </h2>
            <Image
              src={lesson.assignment_image_url}
              alt={`Image for ${lesson.title}`}
              width={600}
              height={400}
              className="mt-2 h-auto w-full rounded-lg border object-contain"
            />
          </div>
        )}
      
       {lesson.attachment_url && (
          <div className="mt-6">
            <h3 className="mb-2 flex items-center text-lg font-semibold">
              <PaperclipIcon className="h-5 w-5 mr-2" /> MATERIAL
            </h3>
            <Button asChild variant="outline">
              <Link href={lesson.attachment_url} target="_blank" rel="noopener noreferrer">
                <EyeIcon className="mr-2 h-4 w-4" /> View Attachment
              </Link>
            </Button>
          </div>
        )}

      {showResponseArea ? (
        <div className="mt-8 border-t border-gray-200 pt-6">
          <h2 className="mb-4 text-2xl font-bold text-gray-800">Your Response</h2>
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
          {lesson.type === LessonType.STANDARD && Array.isArray(serializableAssignment.answers) && (
             <div className="mt-2 space-y-4 rounded-lg border bg-gray-50 p-4">
                {(lesson.questions as string[] || []).map((question, i) => (
                    <div key={i}>
                        <p className="text-sm font-semibold text-gray-600">Question {i + 1}: {question}</p>
                        <p className="prose prose-sm mt-1 text-gray-800 pl-4 border-l-2">{serializableAssignment.answers[i] || 'No answer provided.'}</p>
                    </div>
                ))}
            </div>
          )}
          {lesson.type === LessonType.MULTI_CHOICE && Array.isArray(serializableAssignment.answers) && (
            <div className="space-y-6">
              {lesson.multiChoiceQuestions.map((q, i) => {
                const studentAnswer = serializableAssignment.answers.find((a: any) => a.questionId === q.id);
                return (
                  <div key={q.id} className="p-4 border rounded-lg">
                    <p className="font-semibold">{i + 1}. {q.question}</p>
                    <div className="mt-2 space-y-2">
                      {q.options.map(opt => {
                        const isSelected = studentAnswer?.selectedAnswerId === opt.id;
                        const isCorrect = opt.isCorrect;
                        return (
                          <div key={opt.id} className={cn(
                            "flex items-center gap-2 p-2 rounded-md",
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
          )}
          {lesson.type === LessonType.FLASHCARD && typeof serializableAssignment.answers === 'object' && serializableAssignment.answers !== null && (
             <div className="space-y-4">
                {lesson.flashcards.map((fc) => {
                    const studentPerformance = serializableAssignment.answers[fc.id];
                    return (
                        <div key={fc.id} className={cn("p-4 border rounded-lg flex justify-between items-center",
                            studentPerformance === 'correct' ? 'bg-green-100' : 'bg-red-100'
                        )}>
                            <div>
                                <p className="font-semibold">{fc.term}</p>
                                <p className="text-sm text-gray-600">{fc.definition}</p>
                            </div>
                            {studentPerformance === 'correct' && <Check className="h-6 w-6 text-green-500"/>}
                            {studentPerformance === 'incorrect' && <X className="h-6 w-6 text-red-500"/>}
                        </div>
                    )
                })}
             </div>
          )}
        </div>
      )}
    </div>
  );
}

