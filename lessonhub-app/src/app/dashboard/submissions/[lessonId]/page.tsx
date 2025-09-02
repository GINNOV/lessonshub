// file: src/app/dashboard/submissions/[lessonId]/page.tsx

import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getSubmissionsForLesson, getLessonById } from "@/app/actions/lessonActions";
import { Role } from "@prisma/client";
import { Button } from "@/components/ui/button";

export default async function SubmissionsPage({ params }: { params: { lessonId: string } }) {
  const session = await auth();
  if (!session || session.user.role !== Role.TEACHER) {
    redirect("/");
  }

  const { lessonId } = await params;
  const submissions = await getSubmissionsForLesson(lessonId, session.user.id);
  const lesson = await getLessonById(lessonId);

  if (!lesson) {
    return <div className="p-8">Lesson not found.</div>;
  }

  return (
    <div>
      <Button variant="link" asChild className="mb-4">
        <Link href="/dashboard">&larr; Back to Dashboard</Link>
      </Button>
      <h1 className="text-3xl font-bold">Submissions for: {lesson.title}</h1>

      <div className="mt-6 bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
              <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {submissions.map((sub) => (
              <tr key={sub.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{sub.student.name || sub.student.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    sub.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                    sub.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {sub.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sub.score ?? 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {sub.status === 'COMPLETED' && (
                    <Button variant="link" asChild>
                      <Link href={`/dashboard/grade/${sub.id}`}>Grade</Link>
                    </Button>
                  )}
                  {sub.status === 'GRADED' && (
                    <Button variant="link" asChild>
                      <Link href={`/dashboard/grade/${sub.id}`}>Edit Grade</Link>
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {submissions.length === 0 && <p className="p-6 text-center text-gray-500">No students have been assigned this lesson yet.</p>}
      </div>
    </div>
  );
}