// file: src/app/my-lessons/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
  getAssignmentsForStudent,
  getStudentStats,
} from "@/actions/lessonActions";
import StudentLessonList from "@/app/components/StudentLessonList";
import StudentStatsCard from "@/app/components/StudentStatsCard";
import StudentScorecard from "@/app/components/StudentScorecard";
import { AssignmentStatus } from "@prisma/client";

export default async function StudentDashboard() {
  const session = await auth();
  if (!session) {
    redirect("/signin");
  }

  const [assignments, stats] = await Promise.all([
    getAssignmentsForStudent(session.user.id),
    getStudentStats(session.user.id),
  ]);

  // ✅ FIX: Convert Decimal objects to numbers before passing to the Client Component.
  const serializableAssignments = assignments.map((assignment) => ({
    ...assignment,
    lesson: {
      ...assignment.lesson,
      // Prisma's Decimal type has a .toNumber() method for safe conversion
      price: assignment.lesson.price.toNumber(),
    },
  }));

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
  const failed = assignments.filter(
    (a) => a.status === AssignmentStatus.FAILED
  ).length;

  return (
    <div>
      <h1 className="mb-4 text-3xl font-bold">My Lessons</h1>
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <StudentStatsCard totalValue={stats.totalValue} />
        <StudentScorecard
          total={totalAssignments}
          pending={pending}
          completed={completed}
          graded={graded}
          failed={failed}
        />
      </div>
      {/* Pass the serialized data to the client component */}
      <StudentLessonList assignments={serializableAssignments} />
    </div>
  );
}