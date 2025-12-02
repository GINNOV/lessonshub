import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Role, AssignmentStatus } from "@prisma/client";
import {
  getAssignmentsForStudent,
  getStudentStats,
  getHubGuides,
  getFreeForAllLessons,
} from "@/actions/lessonActions";
import { getDashboardSettings } from "@/actions/adminActions";
import StudentLessonList from "@/app/components/StudentLessonList";
import StudentGuideList, {
  StudentGuideSummary,
} from "@/app/components/StudentGuideList";
import StudentFreeLessonList from "@/app/components/StudentFreeLessonList";
import StudentStatsHeader from "../components/StudentStatsHeader";
import Leaderboard from "../components/Leaderboard";
import {
  getLeaderboardData,
  getStudentGamification,
} from "@/actions/studentActions";
import React from "react";
import StudentGamificationPanel from "../components/StudentGamificationPanel";
import HubGuideBanner from "@/app/components/HubGuideBanner";
import WhatsNewDialog from "@/app/components/WhatsNewDialog";
import { loadLatestUpgradeNote } from "@/lib/whatsNew";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { parseAcceptLanguage, resolveLocale, UiLanguagePreference } from "@/lib/locale";
import { studentDashboardCopy, StudentDashboardLocale } from "@/lib/studentDashboardCopy";
import { BookOpen, Sparkles, Gift } from "lucide-react";

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
  const isTakingBreak =
    studentRecord?.isTakingBreak ?? session.user.isTakingBreak ?? false;
  const signupDate =
    (session.user as any)?.createdAt ? new Date((session.user as any).createdAt) : null;
  const signupFloor = signupDate ?? new Date();

  // If the user is taking a break, show the message and stop further data fetching.
  if (isTakingBreak) {
    return (
      <div className="text-center p-8 border rounded-lg bg-gray-50">
        <h2 className="text-2xl font-bold mb-4">Lessons Paused</h2>
        <p className="max-w-prose mx-auto">
          🇺🇸 You&apos;ve chosen to pause your journey. Reactivate your account
          to restart your lessons. Just click your avatar in the top right and
          select Profile. The rest is history.
        </p>
        <p className="max-w-prose mx-auto mt-4">
          🇮🇹 Hai scelto di mettere in pausa il tuo futuro. Riattiva il tuo
          account per riprendere le lezioni. Ti basta cliccare sull’avatar in
          alto a destra e selezionare Profilo. Il resto e&apos; storia.
        </p>
      </div>
    );
  }

  const guidesPromise = getHubGuides();
  const freeLessonsPromise = getFreeForAllLessons(session.user.id);

  const [
    assignments,
    stats,
    leaderboardData,
    settings,
    gamification,
    whatsNewUS,
    whatsNewIT,
    guides,
    freeLessons,
  ] = await Promise.all([
    getAssignmentsForStudent(session.user.id),
    getStudentStats(session.user.id),
    getLeaderboardData(),
    getDashboardSettings(),
    getStudentGamification(),
    loadLatestUpgradeNote("us"),
    loadLatestUpgradeNote("it"),
    guidesPromise,
    freeLessonsPromise,
  ]);
  const whatsNewNotes = {
    us: whatsNewUS,
    it: whatsNewIT,
  };

  const total = assignments.length;
  const now = new Date();
  const pending = assignments.filter(
    (a) => a.status === AssignmentStatus.PENDING && new Date(a.deadline) > now,
  ).length;
  const submitted = assignments.filter(
    (a) => a.status === AssignmentStatus.COMPLETED,
  ).length;
  const graded = assignments.filter(
    (a) => a.status === AssignmentStatus.GRADED,
  ).length;
  const pastDue = assignments.filter(
    (a) => a.status === AssignmentStatus.PENDING && new Date(a.deadline) <= now,
  ).length;
  const failed = assignments.filter(
    (a) => a.status === AssignmentStatus.FAILED,
  ).length;

  const submittedStatuses = new Set<AssignmentStatus>([
    AssignmentStatus.COMPLETED,
    AssignmentStatus.GRADED,
    AssignmentStatus.FAILED,
  ]);

  const serializableAssignments = assignments.map((assignment) => {
    const {
      _count,
      assignments: lessonAssignments,
      price,
      teacher,
      ...restOfLesson
    } = assignment.lesson;

    const submittedCount = (lessonAssignments || []).filter(
      (lessonAssignment) => submittedStatuses.has(lessonAssignment.status),
    ).length;

    const isFreeLesson =
      price.toNumber() === 0 ||
      (assignment.lesson as any).isFreeForAll ||
      (assignment.lesson as any).guideIsFreeForAll;
    const adjustedDeadline =
      isFreeLesson
        ? (() => {
            const original = new Date(assignment.deadline);
            return original < signupFloor ? signupFloor : original;
          })()
        : assignment.deadline;

    return {
      ...assignment,
      originalDeadline: assignment.originalDeadline ?? null,
      deadline: adjustedDeadline,
      pointsAwarded: assignment.pointsAwarded ?? 0,
      // Ensure optional columns missing in some DBs are present for typing
      teacherAnswerComments: (assignment as any).teacherAnswerComments ?? null,
      lesson: {
        ...restOfLesson,
        price: price.toNumber(),
        completionCount: _count.assignments,
        submittedCount,
        teacher: teacher
          ? {
              ...teacher,
              defaultLessonPrice:
                teacher.defaultLessonPrice?.toNumber() ?? null,
            }
          : null,
      },
    };
  });

  const gamificationSnapshot = gamification
    ? {
        totalPoints: gamification.totalPoints,
        guidePoints: (gamification as any).guidePoints ?? 0,
        goldStarPoints: (gamification as any).goldStarPoints ?? 0,
        goldStarAmount: (gamification as any).goldStarAmount ?? 0,
        badges: gamification.badges.map((badge) => ({
          id: badge.id,
          slug: badge.slug,
          name: badge.name,
          description: badge.description,
          icon: badge.icon,
          category: badge.category,
          awardedAt: badge.awardedAt.toISOString(),
        })),
        nextBadge: gamification.nextBadge,
        recentTransactions: gamification.recentTransactions.map(
          (transaction) => ({
            id: transaction.id,
            points: transaction.points,
            reason: transaction.reason,
            note: transaction.note,
            createdAt: transaction.createdAt.toISOString(),
          }),
        ),
      }
    : null;

  const hasExplicitlyVisibleGuides = guides.some(
    (guide) => guide.guideIsVisible !== false,
  );
  const visibleGuides = hasExplicitlyVisibleGuides
    ? guides.filter((guide) => guide.guideIsVisible !== false)
    : guides;
  const freeGuides = visibleGuides.filter(
    (guide) => guide.guideIsFreeForAll === true,
  );

  const assignedFreeLessons = serializableAssignments
    .filter(
      (assignment) =>
        assignment.lesson.price === 0 ||
        (assignment.lesson as any).isFreeForAll ||
        (assignment.lesson as any).guideIsFreeForAll,
    )
    .map((assignment) => ({
      id: assignment.lesson.id,
      title: assignment.lesson.title,
      type: assignment.lesson.type,
      lesson_preview: assignment.lesson.lesson_preview,
      assignment_image_url: assignment.lesson.assignment_image_url,
      price: assignment.lesson.price,
      difficulty: assignment.lesson.difficulty,
      teacher: assignment.lesson.teacher,
      completionCount: assignment.lesson.completionCount,
    }));

  const mergedFreeLessons = [
    ...assignedFreeLessons,
    ...freeLessons.filter(
      (lesson) => !assignedFreeLessons.some((assigned) => assigned.id === lesson.id),
    ),
  ];

  const guidesForTab = isPaying ? visibleGuides : freeGuides;

  const headerList = await headers();
  const detectedLocales = parseAcceptLanguage(headerList.get("accept-language"));
  const preference = ((session.user as any)?.uiLanguage as UiLanguagePreference) ?? "device";
  const locale = resolveLocale({
    preference,
    detectedLocales,
    supportedLocales: ["en", "it"] as const,
    fallback: "en",
  }) as StudentDashboardLocale;
  const copy = studentDashboardCopy[locale];

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
        copy={copy.stats}
      />
      <section className="mt-10 space-y-6">
        <HubGuideBanner guideCount={guidesForTab.length} copy={copy.guides} />
        {isPaying ? (
          <Tabs defaultValue="lessons" className="space-y-6">
            <TabsList className="mb-2 flex w-full flex-wrap items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/70 px-2 py-1 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
              <TabsTrigger
                value="lessons"
                className="flex-1 min-w-[140px] rounded-lg border border-transparent px-3 py-2 text-sm font-semibold text-slate-300 transition data-[state=active]:border-teal-400/50 data-[state=active]:bg-slate-800 data-[state=active]:text-teal-200 data-[state=active]:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40"
              >
                <span className="flex items-center justify-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  {locale === "it" ? "Lezioni" : "Lessons"}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="guides"
                className="flex-1 min-w-[140px] rounded-lg border border-transparent px-3 py-2 text-sm font-semibold text-slate-300 transition data-[state=active]:border-teal-400/50 data-[state=active]:bg-slate-800 data-[state=active]:text-teal-200 data-[state=active]:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40"
              >
                <span className="flex items-center justify-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  {copy.guides.tabLabel}
                </span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="lessons">
              <StudentLessonList assignments={serializableAssignments} copy={copy.lessons} />
            </TabsContent>
            <TabsContent value="guides">
              {guidesForTab.length > 0 ? (
                <StudentGuideList guides={guidesForTab} copy={copy.guides} />
              ) : (
                <div className="rounded-2xl border border-dashed p-6 text-center text-gray-600">
                  {copy.guides.emptyPaid}
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <Tabs defaultValue="free" className="space-y-6">
            <TabsList className="mb-2 flex w-full flex-wrap items-stretch gap-2 rounded-2xl border border-slate-800 bg-slate-900/70 p-3 shadow-[0_10px_30px_rgba(0,0,0,0.35)] ring-1 ring-slate-800/70">
              <TabsTrigger
                value="free"
                className="flex-1 min-w-[150px] rounded-lg border border-transparent px-3 py-2 text-sm font-semibold text-slate-300 transition data-[state=active]:border-teal-400/50 data-[state=active]:bg-slate-800 data-[state=active]:text-teal-200 data-[state=active]:shadow-lg data-[state=active]:ring-1 data-[state=active]:ring-teal-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40"
              >
                <span className="flex items-center justify-center gap-2">
                  <Gift className="h-4 w-4" />
                  {locale === "it" ? "Lezioni gratuite" : "Free Lessons"}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="lessons"
                className="flex-1 min-w-[150px] rounded-lg border border-transparent px-3 py-2 text-sm font-semibold text-slate-300 transition data-[state=active]:border-teal-400/50 data-[state=active]:bg-slate-800 data-[state=active]:text-teal-200 data-[state=active]:shadow-lg data-[state=active]:ring-1 data-[state=active]:ring-teal-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40"
              >
                <span className="flex items-center justify-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  {locale === "it" ? "Le mie lezioni" : "My Lessons"}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="guides"
                className="flex-1 min-w-[150px] rounded-lg border border-transparent px-3 py-2 text-sm font-semibold text-slate-300 transition data-[state=active]:border-teal-400/50 data-[state=active]:bg-slate-800 data-[state=active]:text-teal-200 data-[state=active]:shadow-lg data-[state=active]:ring-1 data-[state=active]:ring-teal-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40"
              >
                <span className="flex items-center justify-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  {copy.guides.tabLabel}
                </span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="free">
              <StudentFreeLessonList lessons={mergedFreeLessons} copy={{ searchPlaceholder: copy.guides.searchPlaceholder, emptyFree: copy.guides.emptyFree }} />
            </TabsContent>
            <TabsContent value="lessons">
              <StudentLessonList assignments={serializableAssignments} copy={copy.lessons} />
            </TabsContent>
            <TabsContent value="guides">
              {guidesForTab.length > 0 ? (
                <StudentGuideList guides={guidesForTab} copy={copy.guides} />
              ) : (
                <div className="rounded-2xl border border-dashed p-6 text-center text-gray-600">
                  {copy.guides.emptyFree}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </section>

      <div className="mt-10 space-y-8">
        <StudentGamificationPanel data={gamificationSnapshot} />
        <Leaderboard leaderboardData={leaderboardData} />
      </div>
    </div>
  );
}
