// file: src/app/dashboard/grade/[assignmentId]/page.tsx

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getSubmissionForGrading } from "@/app/actions/lessonActions";
import { Role } from "@prisma/client";
import GradingForm from "@/app/components/GradingForm";

// Ensure this line has "export default"
export default async function GradeSubmissionPage({ params }: { params: { assignmentId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== Role.TEACHER) {
    redirect("/");
  }

  const { assignmentId } = await params;
  const submission = await getSubmissionForGrading(assignmentId, session.user.id);

  if (!submission) {
    return <div className="p-8">Submission not found or you do not have permission to view it.</div>;
  }

  return (
    <div className="container mx-auto p-8">
      <Link href={`/dashboard/submissions/${submission.lessonId}`} className="text-blue-600 hover:underline mb-4 inline-block">&larr; Back to Submissions</Link>
      <h1 className="text-3xl font-bold">Grade Submission</h1>
      <p className="text-gray-600 mt-1">Student: {submission.student.name || submission.student.email}</p>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left side: Original Lesson and Student Response */}
        <div className="bg-white p-6 rounded-lg shadow-md space-y-6">
          <div>
            <h2 className="text-xl font-semibold border-b pb-2">Original Lesson: {submission.lesson.title}</h2>
            <div className="prose prose-sm mt-4 max-w-none">{submission.lesson.assignment_text}</div>
          </div>
          <div>
            <h2 className="text-xl font-semibold border-b pb-2">Student's Response</h2>
            <p className="mt-4 whitespace-pre-wrap">{submission.responseText || "No response submitted."}</p>
          </div>
        </div>
        {/* Right side: Grading Form */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <GradingForm assignment={submission} />
        </div>
      </div>
    </div>
  );
}