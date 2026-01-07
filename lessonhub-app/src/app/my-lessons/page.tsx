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
import StudentLessonsDashboard from "@/app/components/StudentLessonsDashboard";
import {
  getLeaderboardData,
  getStudentGamification,
} from "@/actions/studentActions";
import React from "react";
import WhatsNewDialog from "@/app/components/WhatsNewDialog";
import { loadLatestUpgradeNote } from "@/lib/whatsNew";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { parseAcceptLanguage, resolveLocale, UiLanguagePreference } from "@/lib/locale";
import { studentDashboardCopy, StudentDashboardLocale } from "@/lib/studentDashboardCopy";

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
      draftAnswers: (assignment as any).draftAnswers ?? null,
      // Ensure optional columns missing in some DBs are present for typing
      teacherAnswerComments: (assignment as any).teacherAnswerComments ?? null,
      lesson: {
        ...restOfLesson,
        price: price.toNumber(),
        completionCount: _count.assignments,
        submittedCount,
        questionCount: Array.isArray(restOfLesson.questions) ? restOfLesson.questions.length : 0,
        multiChoiceCount: _count.multiChoiceQuestions ?? 0,
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
  const activeBanners = await prisma.studentBanner.findMany({
    where: { isActive: true },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  });
  const bannerCopies = activeBanners.map((banner) => ({
    bannerKicker: banner.kicker,
    bannerTitle: banner.title,
    bannerBody: banner.body,
    bannerCta: banner.ctaText,
    bannerHref: banner.ctaHref || "/profile?tab=status",
  }));

  return (
    <div>
      <WhatsNewDialog notes={whatsNewNotes} defaultLocale="us" />
      <StudentLessonsDashboard
        stats={{
          totalValue: stats.totalValue,
          totalPoints: stats.totalPoints,
          total,
          pending,
          submitted,
          graded,
          failed,
          pastDue,
        }}
        settings={settings}
        copy={copy}
        locale={locale}
        isPaying={isPaying}
        assignments={serializableAssignments}
        guidesForTab={guidesForTab}
        freeLessons={mergedFreeLessons}
        bannerCopies={bannerCopies}
        gamificationSnapshot={gamificationSnapshot}
        leaderboardData={leaderboardData}
      />
    </div>
  );
}
