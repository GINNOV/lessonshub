import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Role, AssignmentStatus } from "@prisma/client";
import { getAssignmentsForStudent, getStudentStats } from "@/actions/lessonActions";
import { getDashboardSettings } from "@/actions/adminActions";
import StudentLessonList from "@/app/components/StudentLessonList";
import StudentStatsHeader from "../components/StudentStatsHeader";
import Leaderboard from "../components/Leaderboard";
import { getLeaderboardData } from "@/actions/studentActions";
import React from "react";

export default async function MyLessonsPage() {
  const session = await auth();

  if (!session) {
    redirect("/signin");
  } else if (session.user.role !== Role.STUDENT) {
    redirect("/dashboard");
  }
  
  // If the user is taking a break, show the message and stop further data fetching.
  if (session.user.isTakingBreak) {
    return (
      <div className="text-center p-8 border rounded-lg bg-gray-50">
        <h2 className="text-2xl font-bold mb-4">Lessons Paused</h2>
        <p className="max-w-prose mx-auto">
          🇺🇸 You&apos;ve chosen to pause your journey. Reactivate your account to restart your lessons. Just click your avatar in the top right and select Profile. The rest is history.
        </p>
        <p className="max-w-prose mx-auto mt-4">
          🇮🇹 Hai scelto di mettere in pausa il tuo futuro. Riattiva il tuo account per riprendere le lezioni. Ti basta cliccare sull’avatar in alto a destra e selezionare Profilo. Il resto e&apos; storia.
        </p>
      </div>
    );
  }

  const [assignments, stats, leaderboardData, settings] = await Promise.all([
    getAssignmentsForStudent(session.user.id),
    getStudentStats(session.user.id),
    getLeaderboardData(),
    getDashboardSettings(),
  ]);

  const total = assignments.length;
  const now = new Date();
  const pending = assignments.filter(a => a.status === AssignmentStatus.PENDING && new Date(a.deadline) > now).length;
  const submitted = assignments.filter(a => a.status === AssignmentStatus.COMPLETED).length;
  const graded = assignments.filter(a => a.status === AssignmentStatus.GRADED).length;
  const failed = assignments.filter(a => a.status === AssignmentStatus.FAILED || (a.status === AssignmentStatus.PENDING && new Date(a.deadline) <= now)).length;

  const serializableAssignments = assignments.map(assignment => {
      const { _count, ...restOfLesson } = assignment.lesson;
      return {
        ...assignment,
        lesson: {
          ...restOfLesson,
          price: assignment.lesson.price.toNumber(),
          completionCount: _count.assignments,
          teacher: assignment.lesson.teacher ? {
              ...assignment.lesson.teacher,
              defaultLessonPrice: assignment.lesson.teacher.defaultLessonPrice?.toNumber() ?? null,
          } : null,
        },
      }
  });


  return (
    <div>
      <StudentStatsHeader 
        totalValue={stats.totalValue}
        total={total}
        pending={pending}
        submitted={submitted}
        graded={graded}
        failed={failed}
        settings={settings}
      />
      <h1 className="text-3xl font-bold mb-8 mt-8">My Lessons</h1>
      <StudentLessonList assignments={serializableAssignments} />
      <Leaderboard leaderboardData={leaderboardData} />
    </div>
  );
}
