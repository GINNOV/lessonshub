// file: src/app/dashboard/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getLessonsForTeacher, getLessonAverageRating } from "@/actions/lessonActions";
import { getLeaderboardDataForTeacher, getTeacherDashboardStats } from "@/actions/teacherActions";
import { getClassesForTeacher } from "@/actions/classActions";
import { Role, User } from "@prisma/client";
import { Button } from "@/components/ui/button";
import TeacherLessonList from "@/app/components/TeacherLessonList";
import TeacherPreferences from "@/app/components/TeacherPreferences";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Users, BookOpen, Mail, Settings, Timer, UserCircle2 } from "lucide-react";
import TeacherClassLeaderboard from "@/app/components/TeacherClassLeaderboard";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import prisma from "@/lib/prisma";
import TeacherStatsHeader from "@/app/components/TeacherStatsHeader";

export const dynamic = "force-dynamic";

type SerializableUser = Omit<User, "defaultLessonPrice"> & {
  defaultLessonPrice: number | null;
};

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

  // Admins see an Admin Dashboard instead of the Teacher view
  if (session.user.role === Role.ADMIN) {
    const adminTiles = [
      { href: '/admin/users', label: 'User Management', icon: Users, color: 'bg-blue-50 text-blue-700 border-blue-200' },
      { href: '/admin/lessons', label: 'Lesson Management', icon: BookOpen, color: 'bg-purple-50 text-purple-700 border-purple-200' },
      { href: '/admin/emails', label: 'Email Editor', icon: Mail, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      { href: '/admin/settings', label: 'Dashboard Settings', icon: Settings, color: 'bg-amber-50 text-amber-700 border-amber-200' },
      { href: '/admin/cron', label: 'Cron Test Page', icon: Timer, color: 'bg-rose-50 text-rose-700 border-rose-200' },
      { href: '/profile', label: 'Profile', icon: UserCircle2, color: 'bg-slate-50 text-slate-700 border-slate-200' },
    ];

    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-gray-600 mb-8">Quick access to admin tools.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminTiles.map(({ href, label, icon: Icon, color }) => (
            <Link key={href} href={href} className={`block rounded-xl border ${color} p-8 text-center shadow-sm hover:shadow-lg transition-shadow`}> 
              <div className="flex flex-col items-center gap-3">
                <Icon className="h-10 w-10" />
                <span className="text-lg font-semibold">{label}</span>
              </div>
            </Link>
          ))}
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

  // Convert Decimal -> number for client/serializable usage
  const serializableTeacher: SerializableUser = {
    ...teacher,
    defaultLessonPrice: teacher.defaultLessonPrice
      ? Number(teacher.defaultLessonPrice.toString())
      : null,
  };

  const classId = typeof resolvedSearchParams.classId === 'string' ? resolvedSearchParams.classId : undefined;

  const [lessons, leaderboardData, stats, classes] = await Promise.all([
    getLessonsForTeacher(session.user.id),
    getLeaderboardDataForTeacher(session.user.id, classId),
    getTeacherDashboardStats(session.user.id),
    getClassesForTeacher(),
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
          classId: teacherLink?.classId ?? null,
          className: teacherLink?.class?.name ?? null,
        };
      });

      return { ...lessonRest, price, assignments: sanitizedAssignments, averageRating };
    })
  );

  // Use the resolved searchParams object to get the day
  const day = typeof resolvedSearchParams.day === 'string' ? resolvedSearchParams.day : null;

  const filteredLessons = day
    ? lessonsWithRatings.filter(lesson =>
        // Check if ANY assignment for this lesson has a deadline on the selected day
        lesson.assignments.some(
          assignment => new Date(assignment.deadline).getDay() === Number(day)
        )
      )
    : lessonsWithRatings;

  const classFilterOptions = classes
    .filter((c: any) => c.isActive)
    .map((c: any) => ({ id: c.id, name: c.name }));

  return (
    <div className="p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
          <p className="mt-1 text-gray-600">Welcome, {session.user?.name ?? "Teacher"}!</p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              Create New Lesson
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href="/dashboard/create">Create standard lesson</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/create/flashcard">Create flashcard</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/create/multi-choice">Create multi choice</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/create/learning-session">Create learning session</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <TeacherStatsHeader stats={stats} />
      <TeacherLessonList
        lessons={filteredLessons}
        classes={classFilterOptions}
      />

      <Accordion type="single" collapsible className="w-full mt-8">
        <AccordionItem value="lesson-defaults">
          <AccordionTrigger>Lesson Defaults</AccordionTrigger>
          <AccordionContent>
            {/* ✅ Pass the SERIALIZED object, not the raw Prisma result */}
            <TeacherPreferences teacher={serializableTeacher as any} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="mt-8">
        {classes.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <a href="/dashboard" className={`px-3 py-1.5 rounded-md text-sm border ${!classId ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>All</a>
            {classes.filter((c: any) => c.isActive).map((c: any) => (
              <a key={c.id} href={`/dashboard?classId=${c.id}`} className={`px-3 py-1.5 rounded-md text-sm border ${classId === c.id ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>{c.name}</a>
            ))}
          </div>
        )}
        <TeacherClassLeaderboard leaderboardData={leaderboardData} />
      </div>
    </div>
  );
}
