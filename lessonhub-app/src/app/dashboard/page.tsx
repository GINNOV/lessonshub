// file: src/app/dashboard/page.tsx

import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getLessonsForTeacher } from "../actions/lessonActions";
import { Role } from "@prisma/client"; // Import the Role enum

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  // Add the role check here
  if (!session || session.user.role !== Role.TEACHER) {
    redirect("/");
  }

  const lessons = await getLessonsForTeacher(session.user.id);

  return (
    <div className="flex min-h-screen flex-col items-center p-8 sm:p-24">
      <div className="w-full max-w-4xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold">Teacher Dashboard</h1>
            <p className="mt-2 text-lg text-gray-600">
              Welcome, {session.user?.name}!
            </p>
          </div>
          <Link
            href="/dashboard/create"
            className="px-6 py-3 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Create New Lesson
          </Link>
        </div>

        <div className="mt-10 bg-white shadow-md rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Your Lessons</h2>
          {lessons.length > 0 ? (
            <ul className="space-y-4">
              {lessons.map((lesson) => (
                <li key={lesson.id} className="p-4 border rounded-md flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-lg">{lesson.title}</h3>
                    <p className="text-sm text-gray-500">Created on: {new Date(lesson.createdAt).toLocaleDateString()}</p>
                  </div>
                  <Link
                    href={`/dashboard/assign/${lesson.id}`}
                    className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-md hover:bg-green-700"
                  >
                    Assign
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p>You haven't created any lessons yet. Click "Create New Lesson" to get started!</p>
          )}
        </div>
      </div>
    </div>
  );
}