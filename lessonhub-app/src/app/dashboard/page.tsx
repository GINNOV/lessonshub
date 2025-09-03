// file: src/app/dashboard/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getLessonsForTeacher } from "@/actions/lessonActions";
import { Role, AssignmentStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import DeleteLessonButton from "@/app/components/DeleteLessonButton"; // <-- Import the new component
import { getWeekAndDay } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await auth();

  if (!session || session.user.role !== Role.TEACHER) {
    redirect("/");
  }

  const lessons = await getLessonsForTeacher(session.user.id);

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
          <p className="mt-1 text-gray-600">
            Welcome, {session.user?.name}!
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/create">Create New Lesson</Link>
        </Button>
      </div>

      <div className="mt-10 bg-white shadow-md rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-4">Your Lessons</h2>
        {lessons.length > 0 ? (
          <ul className="space-y-4">
            {lessons.map((lesson) => {
              const now = new Date();
              const graded = lesson.assignments.filter(
                (a) => a.status === AssignmentStatus.GRADED
              ).length;
              const pending = lesson.assignments.filter(
                (a) => a.status === AssignmentStatus.PENDING && new Date(a.deadline) > now
              ).length;
              const pastDue = lesson.assignments.filter(
                (a) => a.status === AssignmentStatus.PENDING && new Date(a.deadline) <= now
              ).length;

              return (
                <li key={lesson.id} className="p-4 border rounded-md flex justify-between items-center">
                  <div>
                    <Link href={`/dashboard/edit/${lesson.id}`} className="font-bold text-lg hover:underline">
                      {lesson.title}
                    </Link>
                    <p className="text-xs text-gray-400 mt-1">
                      Lesson {getWeekAndDay(lesson.createdAt)} - Created on: {new Date(lesson.createdAt).toLocaleDateString()}
                    </p>
                    <div className="flex items-center space-x-2 mt-2">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        {pending} Pending
                      </span>
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        {graded} Graded
                      </span>
                      {pastDue > 0 && (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                          {pastDue} Past Due
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" asChild>
                      <Link href={`/dashboard/edit/${lesson.id}`}>Edit</Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href={`/dashboard/assign/${lesson.id}`}>Assign</Link>
                    </Button>
                    <Button asChild>
                      <Link href={`/dashboard/submissions/${lesson.id}`}>View Submissions</Link>
                    </Button>
                    {/* --- ADDED DELETE BUTTON --- */}
                    <DeleteLessonButton lessonId={lesson.id} />
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p>You haven&apos;t created any lessons yet.</p>
        )}
      </div>
    </div>
  );
}