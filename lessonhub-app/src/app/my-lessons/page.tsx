import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Role, AssignmentStatus } from "@prisma/client";
import { getAssignmentsForStudent, getStudentStats, getHubGuides } from "@/actions/lessonActions";
import { getDashboardSettings } from "@/actions/adminActions";
import StudentLessonList from "@/app/components/StudentLessonList";
import StudentGuideList, { StudentGuideSummary } from "@/app/components/StudentGuideList";
import StudentStatsHeader from "../components/StudentStatsHeader";
import Leaderboard from "../components/Leaderboard";
import { getLeaderboardData, getStudentGamification } from "@/actions/studentActions";
import React from "react";
import StudentGamificationPanel from "../components/StudentGamificationPanel";
import WhatsNewDialog from "@/app/components/WhatsNewDialog";
import { loadLatestUpgradeNote } from "@/lib/whatsNew";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import prisma from "@/lib/prisma";

export default async function MyLessonsPage() {
  const session = await auth();

  if (!session) {
    redirect("/signin");
  } else if (session.user.role !== Role.STUDENT) {
    redirect("/dashboard");
  }

  const studentRecord = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isPaying: true, isTakingBreak: true },
  });

  const isPaying = studentRecord?.isPaying ?? session.user.isPaying ?? false;
  const isTakingBreak = studentRecord?.isTakingBreak ?? session.user.isTakingBreak ?? false;

  // If the user is taking a break, show the message and stop further data fetching.
  if (isTakingBreak) {
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

  const guidesPromise = getHubGuides();

  const [assignments, stats, leaderboardData, settings, gamification, whatsNewUS, whatsNewIT, guides] = await Promise.all([
    getAssignmentsForStudent(session.user.id),
    getStudentStats(session.user.id),
    getLeaderboardData(),
    getDashboardSettings(),
    getStudentGamification(),
    loadLatestUpgradeNote("us"),
    loadLatestUpgradeNote("it"),
    guidesPromise,
  ]);
  const whatsNewNotes = {
    us: whatsNewUS,
    it: whatsNewIT,
  };

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

  const hasExplicitlyVisibleGuides = guides.some((guide) => guide.guideIsVisible !== false);
  const visibleGuides = hasExplicitlyVisibleGuides ? guides.filter((guide) => guide.guideIsVisible !== false) : guides;
  const freeGuides = visibleGuides.filter((guide) => guide.guideIsFreeForAll === true);

  return (
    <div>
      <WhatsNewDialog notes={whatsNewNotes} defaultLocale="us" />
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
      {isPaying ? (
        <section className="mt-10 space-y-6">
          <div className="rounded-3xl bg-gradient-to-r from-indigo-600 to-blue-500 p-6 text-white shadow-lg">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-100">
                  Hub Guides
                </p>
                <h2 className="text-3xl font-bold mt-1">Always-on practice hub</h2>
                <p className="mt-2 text-indigo-100/80 max-w-xl">
                  Switch between your assigned lessons and on-demand guides anytime.
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-indigo-100">
                  {visibleGuides.length > 0
                    ? `${visibleGuides.length} guide${visibleGuides.length === 1 ? '' : 's'} available`
                    : 'New guides arriving soon'}
                </p>
              </div>
            </div>
          </div>
          <Tabs defaultValue="lessons" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1 sm:max-w-md">
              <TabsTrigger value="lessons">Lessons</TabsTrigger>
              <TabsTrigger value="guides">Hub Guides</TabsTrigger>
            </TabsList>
            <TabsContent value="lessons">
              <StudentLessonList assignments={serializableAssignments} />
            </TabsContent>
            <TabsContent value="guides">
              {visibleGuides.length > 0 ? (
                <StudentGuideList guides={visibleGuides} />
              ) : (
                <div className="rounded-2xl border border-dashed p-6 text-center text-gray-600">
                  New guides are on the way. Stay tuned!
                </div>
              )}
            </TabsContent>
          </Tabs>
        </section>
      ) : (
        <>
          <section className="mt-10 space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold">My Lessons</h1>
              <p className="text-sm text-gray-500">Assignments from your teachers land here first.</p>
            </div>
            <StudentLessonList assignments={serializableAssignments} />
          </section>
          <section className="mt-16 space-y-4">
            <div className="rounded-3xl bg-gradient-to-r from-indigo-600 to-blue-500 p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-100">
                    Hub Guides
                  </p>
                  <h2 className="text-3xl font-bold mt-1">Always-on practice hub</h2>
                  <p className="mt-2 text-indigo-100/80 max-w-xl">
                    Upgrade to unlock interactive guides between lessons.
                  </p>
                </div>
                <Button asChild variant="secondary" className="bg-white text-indigo-700">
                  <Link href="/profile">Unlock Hub Guides</Link>
                </Button>
              </div>
            </div>
            {freeGuides.length > 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Try these free guides—premium members unlock the entire catalog.
                </p>
                <StudentGuideList guides={freeGuides} />
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed p-6 text-center text-gray-600">
                No free guides are available right now. Upgrade to access the full library.
              </div>
            )}
          </section>
        </>
      )}
      <StudentGamificationPanel data={gamificationSnapshot} />
      <Leaderboard leaderboardData={leaderboardData} />
    </div>
  );
}
