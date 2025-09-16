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

  const { assignmentId } = await params; // Correctly await the params
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

  const studentNotesHtml = submission.studentNotes ? ((await marked.parse(submission.studentNotes)) as string) : "";

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

            {submission.lesson.type === LessonType.MULTI_CHOICE && (
                <div className="mt-4 space-y-6">{/* ... Multi-choice answer display ... */}</div>
            )}
            {submission.lesson.type === LessonType.FLASHCARD && (
                <div className="mt-4 text-center">{/* ... Flashcard answer display ... */}</div>
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
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
      </div>

    </div>
  );
}