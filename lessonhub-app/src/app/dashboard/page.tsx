// file: src/app/dashboard/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getLessonsForTeacher } from "../actions/lessonActions";
import { Role } from "@prisma/client";
import { Button } from "@/components/ui/button"; // Import the Shadcn Button

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
              const totalAssignments = lesson.assignments.length;
              const completedAssignments = lesson.assignments.filter(
                (a) => a.status === 'COMPLETED'
              ).length;

              return (
                <li key={lesson.id} className="p-4 border rounded-md flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-lg">{lesson.title}</h3>
                    <p className="text-sm text-gray-500">
                      {completedAssignments} of {totalAssignments} submissions complete
                    </p>
                  </div>
                  {/* Add a container for the two buttons */}
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" asChild>
                      <Link href={`/dashboard/assign/${lesson.id}`}>Assign</Link>
                    </Button>
                    <Button asChild>
                      <Link href={`/dashboard/submissions/${lesson.id}`}>View Submissions</Link>
                    </Button>
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