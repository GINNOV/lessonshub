import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Role, AssignmentStatus } from "@prisma/client";
import { getAssignmentsForStudent, getStudentStats } from "@/actions/lessonActions";
import { getDashboardSettings } from "@/actions/adminActions";
import StudentLessonList from "@/app/components/StudentLessonList";
import StudentStatsHeader from "../components/StudentStatsHeader";
import Leaderboard from "../components/Leaderboard";
import { getLeaderboardData, getStudentGamification } from "@/actions/studentActions";
import React from "react";
import StudentGamificationPanel from "../components/StudentGamificationPanel";

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

  const [assignments, stats, leaderboardData, settings, gamification] = await Promise.all([
    getAssignmentsForStudent(session.user.id),
    getStudentStats(session.user.id),
    getLeaderboardData(),
    getDashboardSettings(),
    getStudentGamification(),
  ]);

  const total = assignments.length;
  const now = new Date();
  const pending = assignments.filter(a => a.status === AssignmentStatus.PENDING && new Date(a.deadline) > now).length;
  const submitted = assignments.filter(a => a.status === AssignmentStatus.COMPLETED).length;
  const graded = assignments.filter(a => a.status === AssignmentStatus.GRADED).length;
  const pastDue = assignments.filter(a => a.status === AssignmentStatus.PENDING && new Date(a.deadline) <= now).length;
  const failed = assignments.filter(a => a.status === AssignmentStatus.FAILED).length;

  const submittedStatuses = new Set<AssignmentStatus>([
    AssignmentStatus.COMPLETED,
    AssignmentStatus.GRADED,
    AssignmentStatus.FAILED,
  ]);

  const serializableAssignments = assignments.map(assignment => {
      const {
        _count,
        assignments: lessonAssignments,
        price,
        teacher,
        ...restOfLesson
      } = assignment.lesson;

      const submittedCount = (lessonAssignments || []).filter((lessonAssignment) =>
        submittedStatuses.has(lessonAssignment.status)
      ).length;

      return {
        ...assignment,
        pointsAwarded: assignment.pointsAwarded ?? 0,
        // Ensure optional columns missing in some DBs are present for typing
        teacherAnswerComments: (assignment as any).teacherAnswerComments ?? null,
        lesson: {
          ...restOfLesson,
          price: price.toNumber(),
          completionCount: _count.assignments,
          submittedCount,
          teacher: teacher ? {
              ...teacher,
              defaultLessonPrice: teacher.defaultLessonPrice?.toNumber() ?? null,
          } : null,
        },
      }
  });

  const gamificationSnapshot = gamification
    ? {
        totalPoints: gamification.totalPoints,
        badges: gamification.badges.map(badge => ({
          id: badge.id,
          slug: badge.slug,
          name: badge.name,
          description: badge.description,
          icon: badge.icon,
          category: badge.category,
          awardedAt: badge.awardedAt.toISOString(),
        })),
        nextBadge: gamification.nextBadge,
        recentTransactions: gamification.recentTransactions.map(transaction => ({
          id: transaction.id,
          points: transaction.points,
          reason: transaction.reason,
          note: transaction.note,
          createdAt: transaction.createdAt.toISOString(),
        })),
      }
    : null;

  return (
    <div>
      <StudentStatsHeader 
        totalValue={stats.totalValue}
        totalPoints={stats.totalPoints}
        total={total}
        pending={pending}
        submitted={submitted}
        graded={graded}
        failed={failed}
        pastDue={pastDue}
        settings={settings}
      />
      <h1 className="text-3xl font-bold mb-8 mt-8">My Lessons</h1>
      <StudentLessonList assignments={serializableAssignments} />
      <StudentGamificationPanel data={gamificationSnapshot} />
      <Leaderboard leaderboardData={leaderboardData} />
    </div>
  );
}
