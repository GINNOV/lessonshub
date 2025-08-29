// file: src/app/my-lessons/page.tsx

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
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
                <div className="flex justify-between items-center">
                  <p className="text-sm">
                    <strong>Deadline:</strong> {new Date(assignment.deadline).toLocaleString()}
                  </p>
                  {/* Show a link to the lesson if it's pending */}
                  {assignment.status === 'PENDING' && (
                    <Link 
                      href={`/assignments/${assignment.id}`} 
                      className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700"
                    >
                      Start Lesson
                    </Link>
                  )}
                </div>
                
                {/* --- ADD THIS BLOCK TO SHOW THE GRADE --- */}
                {assignment.status === 'GRADED' && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-md">
                    <h3 className="font-semibold">Grade and Feedback</h3>
                    <p className="text-2xl font-bold mt-2">Score: {assignment.score}</p>
                    {assignment.teacherComments && (
                      <blockquote className="mt-2 pl-4 border-l-4 border-gray-300 italic">
                        "{assignment.teacherComments}"
                      </blockquote>
                    )}
                  </div>
                )}
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