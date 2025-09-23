// file: src/app/my-lessons/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Role, AssignmentStatus } from "@prisma/client";
import { getAssignmentsForStudent, getStudentStats } from "@/actions/lessonActions";
import StudentLessonList from "@/app/components/StudentLessonList";
import StudentStatsHeader from "../components/StudentStatsHeader";
import Leaderboard from "../components/Leaderboard";
import { getLeaderboardData } from "@/actions/studentActions";

export default async function MyLessonsPage() {
  const session = await auth();

  if (!session) {
    redirect("/signin");
  } else if (session.user.role !== Role.STUDENT) {
    redirect("/dashboard");
  }
  
  const [assignments, stats, leaderboardData] = await Promise.all([
    getAssignmentsForStudent(session.user.id),
    getStudentStats(session.user.id),
    getLeaderboardData(),
  ]);

  const total = assignments.length;
  const now = new Date();
  const pending = assignments.filter(a => a.status === AssignmentStatus.PENDING && new Date(a.deadline) > now).length;
  const submitted = assignments.filter(a => a.status === AssignmentStatus.COMPLETED).length;
  const graded = assignments.filter(a => a.status === AssignmentStatus.GRADED).length;
  const failed = assignments.filter(a => a.status === AssignmentStatus.FAILED || (a.status === AssignmentStatus.PENDING && new Date(a.deadline) <= now)).length;


  const serializableAssignments = assignments.map(assignment => ({
      ...assignment,
      lesson: {
        ...assignment.lesson,
        price: assignment.lesson.price.toNumber(),
        completionCount: assignment.lesson._count.assignments,
        teacher: assignment.lesson.teacher ? {
            ...assignment.lesson.teacher,
            defaultLessonPrice: assignment.lesson.teacher.defaultLessonPrice?.toNumber() ?? null,
        } : null,
      },
  }));

  return (
    <div>
      <StudentStatsHeader 
        totalValue={stats.totalValue}
        total={total}
        pending={pending}
        submitted={submitted}
        graded={graded}
        failed={failed}
      />
      <h1 className="text-3xl font-bold mb-8 mt-8">My Lessons</h1>
      <StudentLessonList assignments={serializableAssignments} />
      <Leaderboard leaderboardData={leaderboardData} />
    </div>
  );
}