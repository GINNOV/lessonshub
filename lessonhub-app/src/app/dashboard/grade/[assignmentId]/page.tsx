// file: src/app/dashboard/grade/[assignmentId]/page.tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getSubmissionForGrading } from "@/actions/lessonActions";
import { LessonType, Role } from "@prisma/client";
import GradingForm from "@/app/components/GradingForm";
import { Button } from "@/components/ui/button";
import { marked } from "marked";
import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default async function GradeSubmissionPage({
  params,
}: {
  params: { assignmentId: string };
}) {
  const session = await auth();
  if (!session || session.user.role !== Role.TEACHER) {
    redirect("/");
  }

  const { assignmentId } = params;
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

  const assignmentHtml = submission.lesson.assignment_text
    ? ((await marked.parse(submission.lesson.assignment_text)) as string)
    : "";

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
        {/* --- LEFT COLUMN --- */}
        <div className="space-y-6 rounded-lg border bg-white p-6 shadow-md">
          {/* --- LESSON CONTENT SECTION --- */}
          <div>
            <h2 className="border-b pb-2 text-xl font-semibold">
              Lesson Content: {submission.lesson.title}
            </h2>
            <div className="prose prose-sm mt-4 max-w-none">
              <div dangerouslySetInnerHTML={{ __html: assignmentHtml }} />
            </div>
          </div>

          {/* --- STUDENT RESPONSE SECTION --- */}
          <div>
            <h2 className="border-b pb-2 text-xl font-semibold">
              Student&apos;s Response
            </h2>

            {/* --- MULTI_CHOICE LESSON RESPONSE --- */}
            {submission.lesson.type === LessonType.MULTI_CHOICE && (
              <div className="mt-4 space-y-6">
                {submission.lesson.multiChoiceQuestions.map(
                  (question, index) => {
                    const studentAnswers =
                      submission.answers as Record<string, string> | null;
                    const studentAnswerId = studentAnswers?.[question.id];
                    return (
                      <div key={question.id}>
                        <p className="rounded-md border bg-gray-50 p-3 font-semibold shadow-sm">
                          Q{index + 1}❓ {question.question}
                        </p>
                        <div className="mt-2 space-y-2 pl-4">
                          {question.options.map((option) => {
                            const isCorrectAnswer = option.isCorrect;
                            const isStudentAnswer = option.id === studentAnswerId;
                            return (
                              <div
                                key={option.id}
                                className={cn(
                                  "flex items-center rounded-md border p-2",
                                  isCorrectAnswer && "bg-green-100",
                                  isStudentAnswer &&
                                    !isCorrectAnswer &&
                                    "bg-red-100"
                                )}
                              >
                                {isCorrectAnswer ? (
                                  <CheckCircle2 className="mr-2 h-5 w-5 flex-shrink-0 text-green-600" />
                                ) : isStudentAnswer ? (
                                  <XCircle className="mr-2 h-5 w-5 flex-shrink-0 text-red-600" />
                                ) : (
                                  <div className="mr-2 h-5 w-5 flex-shrink-0"></div>
                                )}
                                <span
                                  className={cn(isStudentAnswer && "font-bold")}
                                >
                                  {option.text}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}

            {/* --- STANDARD LESSON RESPONSE --- */}
            {submission.lesson.type === LessonType.STANDARD && (
              <div className="mt-4 space-y-6">
                {(submission.lesson.questions as string[])?.map(
                  (question, index) => {
                    const studentAnswers = submission.answers as
                      | string[]
                      | null;
                    return (
                      <div key={index}>
                        <p className="rounded-md border bg-gray-50 p-3 font-semibold shadow-sm">
                          Q{index + 1}❓ {question}
                        </p>
                        <p className="mt-2 pl-4 text-gray-700">
                          {studentAnswers?.[index] || "No answer provided."}
                        </p>
                      </div>
                    );
                  }
                )}
              </div>
            )}

            {/* --- FLASHCARD LESSON RESPONSE --- */}
            {submission.lesson.type === LessonType.FLASHCARD && (
              <div className="mt-4 text-center">
                <p className="rounded-md bg-blue-50 p-4 text-blue-800">
                  This student completed the flashcard review session.
                </p>
              </div>
            )}

            {submission.studentNotes && (
              <div className="mt-4">
                <h3 className="font-semibold">Student Notes</h3>
                <p className="mt-1 whitespace-pre-wrap">
                  {submission.studentNotes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* --- RIGHT COLUMN --- */}
        <div className="rounded-lg border bg-white p-6 shadow-md">
          <GradingForm assignment={submission} />
        </div>
      </div>
      {/* ✅ FIX: This closing div was missing, causing the "Unexpected eof" error. */}
    </div>
  );
}