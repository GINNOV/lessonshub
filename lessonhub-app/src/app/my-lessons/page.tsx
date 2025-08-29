// file: src/app/my-lessons/page.tsx

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { getAssignmentsForStudent } from "../actions/lessonActions";

export default async function StudentDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/signin");
  }

  const assignments = await getAssignmentsForStudent(session.user.id);

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">My Lessons</h1>

      <div className="space-y-6">
        {assignments.length > 0 ? (
          assignments.map((assignment) => (
            <div key={assignment.id} className="p-6 bg-white border rounded-lg shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold">{assignment.lesson.title}</h2>
                  <p className="text-sm text-gray-500">
                    Assigned by: {assignment.lesson.teacher.name}
                  </p>
                </div>
                <span 
                  className={`px-3 py-1 text-xs font-medium rounded-full
                    ${assignment.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : ''}
                    ${assignment.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' : ''}
                    ${assignment.status === 'GRADED' ? 'bg-green-100 text-green-800' : ''}
                  `}
                >
                  {assignment.status}
                </span>
              </div>
              <div className="mt-4 border-t pt-4">
                <p className="text-sm">
                  <strong>Deadline:</strong> {new Date(assignment.deadline).toLocaleString()}
                </p>
                {/* We'll add a "Start Lesson" button here later */}
              </div>
            </div>
          ))
        ) : (
          <p>You have no assigned lessons.</p>
        )}
      </div>
    </div>
  );
}