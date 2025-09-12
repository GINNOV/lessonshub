// file: lessonhub-app/src/app/dashboard/grade/[assignmentId]/page.tsx

import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@/auth";
import { getSubmissionForGrading } from "@/actions/lessonActions";
import { Role } from "@prisma/client";
import GradingForm from "@/app/components/GradingForm";
import { Button } from "@/components/ui/button";
import { marked } from 'marked';

type Flashcard = {
  id: number;
  term: string;
  definition: string;
  imageUrl?: string;
};

export default async function GradeSubmissionPage({ params }: { params: { assignmentId: string } }) {
  const session = await auth();
  if (!session || session.user.role !== Role.TEACHER) {
    redirect("/");
  }

  const { assignmentId } = params;
  const submission = await getSubmissionForGrading(assignmentId, session.user.id);

  if (!submission) {
    return (
        <div className="text-center">
            <p>Submission not found or you don&apos;t have permission to view it.</p>
            <Button asChild className="mt-4">
                <Link href="/dashboard">Return to Dashboard</Link>
            </Button>
        </div>
    );
  }

  // Safely parse markdown content, handling null values
  const assignmentHtml = submission.lesson.assignment_text ? (await marked.parse(submission.lesson.assignment_text)) as string : '';
  const questions = submission.lesson.questions as string[] | null;
  const answers = submission.answers as string[] | null;
  const flashcards = submission.lesson.flashcards as Flashcard[] | null;


  return (
    <div>
      <Button variant="link" asChild className="mb-4 pl-0">
          <Link href={`/dashboard/submissions/${submission.lessonId}`}>&larr; Back to Submissions</Link>
      </Button>
      <h1 className="text-3xl font-bold">Grade Submission</h1>
      <p className="text-gray-600 mt-1">Student: {submission.student.name || submission.student.email}</p>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow-md space-y-6 border">
          <div>
            <h2 className="text-xl font-semibold border-b pb-2">Lesson Content: {submission.lesson.title}</h2>

            {/* Conditional rendering for STANDARD lesson type */}
            {submission.lesson.type === 'STANDARD' && (
              <>
                {submission.lesson.assignment_image_url && (
                  <div className="my-4">
                    <Image
                      src={submission.lesson.assignment_image_url}
                      alt={`Image for ${submission.lesson.title}`}
                      width={500}
                      height={300}
                      className="w-full h-auto rounded-md border"
                    />
                  </div>
                )}
                <div className="prose prose-sm mt-4 max-w-none" dangerouslySetInnerHTML={{ __html: assignmentHtml }} />
              </>
            )}
            
            {/* Conditional rendering for FLASHCARD lesson type */}
            {submission.lesson.type === 'FLASHCARD' && flashcards && (
              <div className="mt-4 space-y-4">
                {flashcards.map((card) => (
                  <div key={card.id} className="p-3 bg-gray-50 rounded-md border">
                    <p className="font-semibold">{card.term}</p>
                    <p className="text-sm text-gray-600">{card.definition}</p>
                    {card.imageUrl && <p className="text-xs text-blue-500 mt-1">Image included</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Conditional rendering for student response in STANDARD lessons */}
          {submission.lesson.type === 'STANDARD' && (
            <div>
              <h2 className="text-xl font-semibold border-b pb-2">Student&apos;s Response</h2>
              {questions && answers && (
                <div className="space-y-6 mt-4">
                  {questions.map((question, index) => (
                    <div key={index}>
                      <p className="p-3 bg-gray-50 rounded-md border shadow-sm font-semibold">Q{index + 1}❓ {question}</p>
                      <p className="mt-2 pl-4 text-gray-700">{answers[index] || "No answer provided."}</p>
                    </div>
                  ))}
                </div>
              )}
              {submission.studentNotes && (
                <div className="mt-4">
                  <h3 className="font-semibold">Student Notes</h3>
                  <p className="mt-1 whitespace-pre-wrap">{submission.studentNotes}</p>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <GradingForm assignment={submission} />
        </div>
      </div>
    </div>
  );
}