import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Role, AssignmentStatus, PointReason } from "@prisma/client";
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
import Link from "next/link";
import WhatsNewDialog from "@/app/components/WhatsNewDialog";
import { loadLatestUpgradeNote } from "@/lib/whatsNew";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { EXTENSION_POINT_COST } from "@/lib/lessonExtensions";
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
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-center text-slate-100 shadow-[0_20px_60px_rgba(15,23,42,0.35)]">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-slate-700 bg-slate-950/70 text-2xl">
          ⏸️
        </div>
        <h2 className="text-2xl font-bold mb-3">Lessons Paused</h2>
        <p className="mx-auto max-w-prose text-slate-300">
          🇺🇸 You&apos;ve chosen to pause your journey. Reactivate your account
          to restart your lessons. Just click your avatar in the top right and
          select Profile. The rest is history.
        </p>
        <p className="mx-auto mt-4 max-w-prose text-slate-300">
          🇮🇹 Hai scelto di mettere in pausa il tuo futuro. Riattiva il tuo
          account per riprendere le lezioni. Ti basta cliccare sull’avatar in
          alto a destra e selezionare Profilo. Il resto e&apos; storia.
        </p>
        <div className="mx-auto mt-6 max-w-prose rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-left text-sm text-slate-300">
          <p className="font-semibold text-slate-100">Resume lessons</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Open Profile.</li>
            <li>Go to the “Take a break” section.</li>
            <li>Turn off the pause toggle.</li>
          </ol>
          <p className="mt-3 font-semibold text-slate-100">Riprendi le lezioni</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Apri Profilo.</li>
            <li>Vai alla sezione “Take a break”.</li>
            <li>Disattiva lo switch della pausa.</li>
          </ol>
        </div>
        <div className="mt-6 flex justify-center">
          <Link
            href="/profile?tab=delete"
            className="inline-flex items-center rounded-xl border border-teal-300/50 bg-gradient-to-r from-teal-400 to-emerald-500 px-5 py-2 text-sm font-semibold text-slate-950 shadow-[0_12px_35px_rgba(45,212,191,0.35)] transition hover:brightness-110"
          >
            Go to Profile
          </Link>
        </div>
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
  const assignmentIds = assignments.map((assignment) => assignment.id);
  const marketplacePurchases = assignmentIds.length
    ? await prisma.pointTransaction.findMany({
        where: {
          userId: session.user.id,
          reason: PointReason.MARKETPLACE_PURCHASE,
          assignmentId: { in: assignmentIds },
        },
        select: { assignmentId: true },
      })
    : [];
  const extensionTransactions = assignmentIds.length
    ? await prisma.pointTransaction.findMany({
        where: {
          userId: session.user.id,
          assignmentId: { in: assignmentIds },
          points: -EXTENSION_POINT_COST,
          note: { contains: 'Lesson extension' },
        },
        select: { assignmentId: true },
      })
    : [];
  const purchasedAssignmentIds = new Set(
    marketplacePurchases
      .map((purchase) => purchase.assignmentId)
      .filter((id): id is string => Boolean(id)),
  );
  const extendedAssignmentIds = new Set(
    extensionTransactions
      .map((transaction) => transaction.assignmentId)
      .filter((id): id is string => Boolean(id)),
  );
  const now = new Date();
  const getAvailabilityDate = (assignment: typeof assignments[number]) =>
    assignment.startDate || assignment.assignedAt || assignment.deadline;
  const isAvailable = (assignment: typeof assignments[number]) => {
    const availability = new Date(getAvailabilityDate(assignment));
    if (Number.isNaN(availability.getTime())) return true;
    return availability <= now;
  };
  const pending = assignments.filter(
    (a) =>
      a.status === AssignmentStatus.PENDING &&
      isAvailable(a) &&
      new Date(a.deadline) > now &&
      !purchasedAssignmentIds.has(a.id),
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

    const normalizedOriginalDeadline = assignment.originalDeadline ?? null;

    return {
      ...assignment,
      originalDeadline: normalizedOriginalDeadline,
      deadline: adjustedDeadline,
      pointsAwarded: assignment.pointsAwarded ?? 0,
      draftAnswers: (assignment as any).draftAnswers ?? null,
      marketplacePurchased: purchasedAssignmentIds.has(assignment.id),
      extensionUsed: extendedAssignmentIds.has(assignment.id),
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
    where: {
      isActive: true,
      OR: [{ locale: null }, { locale }],
    },
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
      <WhatsNewDialog notes={whatsNewNotes} defaultLocale={locale === "it" ? "it" : "us"} />
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
