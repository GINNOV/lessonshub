// file: src/app/dashboard/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getLessonsForTeacher, getLessonAverageRating } from "@/actions/lessonActions";
import { getLeaderboardDataForTeacher, getTeacherDashboardStats } from "@/actions/teacherActions";
import { getClassesForTeacher } from "@/actions/classActions";
import { Role } from "@prisma/client";
import { Button } from "@/components/ui/button";
import TeacherLessonList from "@/app/components/TeacherLessonList";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Filter } from "lucide-react";
import TeacherClassLeaderboard from "@/app/components/TeacherClassLeaderboard";
import prisma from "@/lib/prisma";
import TeacherStatsHeader from "@/app/components/TeacherStatsHeader";
import WhatsNewDialog from "@/app/components/WhatsNewDialog";
import { loadLatestUpgradeNote } from "@/lib/whatsNew";
import { ADMIN_TILES } from "@/lib/adminTiles";
import LoginHistoryCard from "@/app/components/LoginHistoryCard";
import CollapsibleSection from "@/app/components/CollapsibleSection";
import AiFeaturesCard from "@/app/components/AiFeaturesCard";
import { getAiSettings } from "@/actions/adminActions";

export const dynamic = "force-dynamic";

function getISOWeek(date: Date) {
  const tempDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = tempDate.getUTCDay() || 7;

  tempDate.setUTCDate(tempDate.getUTCDate() + 4 - day);

  const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
  const diff = tempDate.getTime() - yearStart.getTime();

  return Math.ceil((diff / 86400000 + 1) / 7);
}

function getWeekNumber(date: Date, timeZone?: string | null) {
  if (!timeZone) {
    return getISOWeek(date);
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });

  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    return getISOWeek(date);
  }

  const zonedDate = new Date(Date.UTC(year, month - 1, day));
  return getISOWeek(zonedDate);
}

// Correctly type searchParams as a Promise for a dynamic page
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();

  if (!session) redirect("/signin");
  if (session.user.role === Role.STUDENT) redirect("/my-lessons");
  if (session.user.role !== Role.TEACHER && session.user.role !== Role.ADMIN) redirect("/");

  const [whatsNewUS, whatsNewIT] = await Promise.all([
    loadLatestUpgradeNote("us"),
    loadLatestUpgradeNote("it"),
  ]);
  const whatsNewNotes = {
    us: whatsNewUS,
    it: whatsNewIT,
  };

  // Admins see an Admin Dashboard instead of the Teacher view
  if (session.user.role === Role.ADMIN) {
    const aiSettings = await getAiSettings();
    return (
      <div className="p-6">
        <WhatsNewDialog notes={whatsNewNotes} />
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-gray-600 mb-8">Quick access to admin tools.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {ADMIN_TILES.map(({ href, label, icon: Icon, color }) => (
            <Link key={href} href={href} className={`block rounded-xl border ${color} p-8 text-center shadow-sm hover:shadow-lg transition-shadow`}> 
              <div className="flex flex-col items-center gap-3">
                <Icon className="h-10 w-10" />
                <span className="text-lg font-semibold">{label}</span>
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-8">
          <AiFeaturesCard initialGeminiApiKey={aiSettings?.geminiApiKey ?? null} />
        </div>
      </div>
    );
  }

  // Await the searchParams promise to resolve it
  const resolvedSearchParams = await searchParams;

  const teacher = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!teacher) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Teacher Dashboard</h1>
        <p className="mt-2 text-red-600">Could not load teacher data. Please try again later.</p>
      </div>
    );
  }

  const classId = typeof resolvedSearchParams.classId === 'string' ? resolvedSearchParams.classId : undefined;
  const weekNumber = getWeekNumber(new Date(), teacher.timeZone);

  const [lessons, leaderboardData, stats, classes, recentLogins] = await Promise.all([
    getLessonsForTeacher(session.user.id),
    getLeaderboardDataForTeacher(session.user.id, classId),
    getTeacherDashboardStats(session.user.id),
    getClassesForTeacher(),
    prisma.loginEvent.findMany({
      where: {
        user: {
          teachers: {
            some: { teacherId: session.user.id },
          },
        },
      },
      include: {
        user: {
          select: { name: true },
        },
        lesson: {
          select: { id: true, title: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  ]);

  const lessonsWithRatings = await Promise.all(
    lessons.map(async (lesson) => {
      // Convert lesson price from Decimal to number
      const price = lesson.price
        ? Number(lesson.price.toString())
        : 0;

      const averageRating = (await getLessonAverageRating(lesson.id)) ?? null;

      const { assignments, ...lessonRest } = lesson;

      const sanitizedAssignments = assignments.map((assignment) => {
        const teacherLink = assignment.student?.teachers?.[0];
        return {
          status: assignment.status,
          deadline: assignment.deadline,
          startDate: assignment.startDate,
          assignedAt: assignment.assignedAt,
          classId: teacherLink?.classId ?? null,
          className: teacherLink?.class?.name ?? null,
        };
      });

      return {
        ...lessonRest,
        price,
        isFreeForAll: !!(lesson as any).isFreeForAll,
        guideIsFreeForAll: !!(lesson as any).guideIsFreeForAll,
        assignments: sanitizedAssignments,
        averageRating,
      };
    })
  );

  // Use the resolved searchParams object to get the day
  const day = typeof resolvedSearchParams.day === 'string' ? resolvedSearchParams.day : null;

  const filteredLessons = day
    ? lessonsWithRatings.filter(lesson =>
        // Check if ANY assignment for this lesson becomes available on the selected day
        lesson.assignments.some(
          assignment => {
            const availableDate = assignment.startDate ?? assignment.assignedAt;
            if (!availableDate) {
              return false;
            }
            return new Date(availableDate).getDay() === Number(day);
          }
        )
      )
    : lessonsWithRatings;

  const classFilterOptions = classes
    .filter((c: any) => c.isActive)
    .map((c: any) => ({ id: c.id, name: c.name }));

  const studentLoginEntries = recentLogins.map((event) => ({
    id: event.id,
    timestamp: event.createdAt.toISOString(),
    lessonId: event.lessonId,
    lessonTitle: event.lesson?.title ?? null,
    studentName: event.user?.name ?? 'Student',
  }));

  return (
    <div className="p-6 text-slate-100">
      <WhatsNewDialog notes={whatsNewNotes} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
          <p className="mt-1 text-slate-400">Welcome, {session.user?.name ?? "Teacher"}! It&apos;s week {weekNumber}.</p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="bg-gradient-to-r from-teal-400 to-emerald-500 text-slate-950 shadow-[0_12px_35px_rgba(45,212,191,0.35)] hover:brightness-110">
              Create New Lesson
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href="/dashboard/create">Topic</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/create/flashcard">Flashcard</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/create/multi-choice">Multi choice</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/create/composer">Composer</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/create/lyric">Lyric</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/create/learning-session">Guide</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <TeacherStatsHeader stats={stats} />
      <div className="mt-8">
        <CollapsibleSection title="Your assignments" defaultOpen>
          <TeacherLessonList
            lessons={filteredLessons}
            classes={classFilterOptions}
          />

          <div className="mt-6">
            {classes.length > 0 && (
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <a href="/dashboard" className={`px-3 py-1.5 rounded-md text-sm border ${!classId ? 'border-teal-300/60 bg-teal-500/20 text-teal-50 shadow-[0_10px_25px_rgba(45,212,191,0.18)]' : 'border-slate-800 bg-slate-900/60 text-slate-200 hover:border-teal-400/60'}`}>All</a>
                {classes.filter((c: any) => c.isActive).map((c: any) => (
                  <a key={c.id} href={`/dashboard?classId=${c.id}`} className={`px-3 py-1.5 rounded-md text-sm border ${classId === c.id ? 'border-teal-300/60 bg-teal-500/20 text-teal-50 shadow-[0_10px_25px_rgba(45,212,191,0.18)]' : 'border-slate-800 bg-slate-900/60 text-slate-200 hover:border-teal-400/60'}`}>{c.name}</a>
                ))}
              </div>
            )}
          </div>
        </CollapsibleSection>
      </div>
      <div className="mt-8">
        <TeacherClassLeaderboard leaderboardData={leaderboardData} />
      </div>
      <div className="mt-8">
        <CollapsibleSection title="Student activities" defaultOpen={false}>
          <LoginHistoryCard
            entries={studentLoginEntries}
            title="Student activities"
            emptyMessage="No recent activity from your students yet."
            getLessonHref={(lessonId) => `/dashboard/assign/${lessonId}`}
          />
        </CollapsibleSection>
      </div>
    </div>
  );
}
