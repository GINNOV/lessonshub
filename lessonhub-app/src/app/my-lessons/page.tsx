// file: src/app/my-lessons/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
  getAssignmentsForStudent,
  getStudentStats,
} from "@/actions/lessonActions";
import StudentLessonList from "@/app/components/StudentLessonList";
import StudentStatsHeader from "@/app/components/StudentStatsHeader";
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

  // Convert the Decimal objects to numbers before passing to any Client Component.
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

      {/* Pass the newly serialized data to the client component */}
      <StudentLessonList assignments={serializableAssignments} />
    </div>
  );
}