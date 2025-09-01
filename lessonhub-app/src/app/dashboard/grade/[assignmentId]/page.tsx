// file: src/app/dashboard/grade/[assignmentId]/page.tsx

import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@/auth";
import { getSubmissionForGrading } from "@/app/actions/lessonActions";
import { Role } from "@prisma/client";
import GradingForm from "@/app/components/GradingForm";
import { Button } from "@/components/ui/button";
import { marked } from 'marked'; // <-- Import marked

export default async function GradeSubmissionPage({ params }: { params: { assignmentId: string } }) {
  const session = await auth();
  if (!session || session.user.role !== Role.TEACHER) {
    redirect("/");
  }

  const { assignmentId } = await params;
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

  // Parse the markdown content to HTML
  const assignmentHtml = marked.parse(submission.lesson.assignment_text);

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
            <h2 className="text-xl font-semibold border-b pb-2">Original Lesson: {submission.lesson.title}</h2>
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
            {/* --- UPDATED TO RENDER MARKDOWN --- */}
            <div className="prose prose-sm mt-4 max-w-none" dangerouslySetInnerHTML={{ __html: assignmentHtml }} />
          </div>
          <div>
            <h2 className="text-xl font-semibold border-b pb-2">Student&apos;s Response</h2>
            <p className="mt-4 whitespace-pre-wrap">{submission.responseText || "No response submitted."}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <GradingForm assignment={submission} />
        </div>
      </div>
    </div>
  );
}