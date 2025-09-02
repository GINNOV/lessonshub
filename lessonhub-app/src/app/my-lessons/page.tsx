// file: src/app/my-lessons/page.tsx

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAssignmentsForStudent } from "@/actions/lessonActions";
import FilteredLessonList from "../components/FilteredLessonList";
import { AssignmentStatus } from "@prisma/client";

export default async function StudentDashboardPage() {
  const session = await auth();
  if (!session) {
    redirect("/signin");
  }

  const assignments = await getAssignmentsForStudent(session.user.id);

  const stats = {
    pending: assignments.filter(a => a.status === AssignmentStatus.PENDING).length,
    completed: assignments.filter(a => a.status === AssignmentStatus.COMPLETED).length,
    graded: assignments.filter(a => a.status === AssignmentStatus.GRADED).length,
  };

  const totalPoints = assignments
    .filter(a => a.status === AssignmentStatus.GRADED)
    .reduce((sum, a) => sum + (a.score || 0), 0);
  
  const statCards = [
    { title: "Total Points", value: totalPoints, icon: <StarIcon className="w-6 h-6 text-yellow-500" /> },
    { title: "Pending", value: stats.pending, icon: <ClockIcon className="w-6 h-6 text-gray-500" /> },
    { title: "Completed", value: stats.completed, icon: <CheckCircleIcon className="w-6 h-6 text-blue-500" /> },
    { title: "Graded", value: stats.graded, icon: <GraduationCapIcon className="w-6 h-6 text-green-500" /> },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Lessons</h1>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border mb-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          {statCards.map(card => (
            <div key={card.title}>
              <div className="flex justify-center items-center mb-1">{card.icon}</div>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-xs font-medium text-gray-500 uppercase">{card.title}</p>
            </div>
          ))}
        </div>
      </div>
      
      {/* --- USE THE NEW FILTERABLE COMPONENT --- */}
      <FilteredLessonList assignments={assignments} />
    </div>
  );
}


// --- SVG Icon Components ---

function StarIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function ClockIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function CheckCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function GraduationCapIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  );
}