// file: src/app/my-lessons/page.tsx

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { getAssignmentsForStudent } from "../actions/lessonActions";
import StudentLessonList from "../components/StudentLessonList"; // Import the new component

export default async function StudentDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/signin");
  }

  const assignments = await getAssignmentsForStudent(session.user.id);

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">My Lessons</h1>

      {/* Use the client component to display the list */}
      <StudentLessonList assignments={assignments} />
    </div>
  );
}