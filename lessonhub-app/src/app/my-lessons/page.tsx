// file: src/app/my-lessons/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
  getAssignmentsForStudent,
  getStudentStats,
  getLessonCompletionStats,
} from "@/actions/lessonActions";
import { getLeaderboardData } from "@/actions/studentActions"; // Import the new action
import StudentLessonList from "@/app/components/StudentLessonList";
import StudentStatsHeader from "@/app/components/StudentStatsHeader";
import Leaderboard from "@/app/components/Leaderboard"; // Import the new component
import { AssignmentStatus } from "@prisma/client";

export default async function StudentDashboard() {
  const session = await auth();
  if (!session) {
    redirect("/signin");
  }

  const [assignments, stats, leaderboardData] = await Promise.all([
    getAssignmentsForStudent(session.user.id),
    getStudentStats(session.user.id),
    getLeaderboardData(),
  ]);

  const assignmentsWithStats = await Promise.all(
    assignments.map(async (assignment) => {
      const completionCount = await getLessonCompletionStats(assignment.lessonId);
      return {
        ...assignment,
        lesson: {
          ...assignment.lesson,
          price: assignment.lesson.price.toNumber(),
          teacher: assignment.lesson.teacher ? {
            ...assignment.lesson.teacher,
            defaultLessonPrice: assignment.lesson.teacher.defaultLessonPrice?.toNumber() ?? null,
          } : null,
        },
        completionCount,
      };
    })
  );

  const totalAssignments = assignments.length;
  const pending = assignments.filter(
    (a) => a.status === AssignmentStatus.PENDING
  ).length;
  const completed = assignments.filter(
    (a) => a.status === AssignmentStatus.COMPLETED
  ).length;
  const graded = assignments.filter(
    (a) => a.status === AssignmentStatus.GRADED
  ).length;

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">My Lessons</h1>

      <StudentStatsHeader
        totalValue={stats.totalValue}
        total={totalAssignments}
        pending={pending}
        submitted={completed}
        graded={graded}
      />

      <StudentLessonList assignments={assignmentsWithStats} />

      <Leaderboard leaderboardData={leaderboardData} />
    </div>
  );
}