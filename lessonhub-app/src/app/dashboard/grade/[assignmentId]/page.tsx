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

// ... (type definitions remain the same) ...
type MultiChoiceAnswer = {
  questionId: string;
  selectedAnswerId: string;
  isCorrect: boolean;
};

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
    // ... (no-submission block remains the same) ...
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
      {/* ... (header and student info remains the same) ... */}
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
          {/* ... (Lesson Content Section remains the same) ... */}
          <div>
            <h2 className="border-b pb-2 text-xl font-semibold">
              Lesson Content: {submission.lesson.title}
            </h2>
            <div className="prose prose-sm mt-4 max-w-none">
              <div dangerouslySetInnerHTML={{ __html: assignmentHtml }} />
            </div>
          </div>


          <div>
            <h2 className="border-b pb-2 text-xl font-semibold">
              Student&apos;s Response
            </h2>

            {/* ... (Multi-Choice and Flashcard sections remain the same) ... */}
            {submission.lesson.type === LessonType.MULTI_CHOICE && (
                <div className="mt-4 space-y-6">{/* ... */}</div>
            )}
            {submission.lesson.type === LessonType.FLASHCARD && (
                <div className="mt-4 text-center">{/* ... */}</div>
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
                        {/* ✅ TWEAK 2.0: Using a blockquote for a much more visible answer block. */}
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

        <div className="rounded-lg border bg-white p-6 shadow-md">
          <GradingForm assignment={submission} />
        </div>
      </div>
    </div>
  );
}