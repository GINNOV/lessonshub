// file: src/app/dashboard/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getLessonsForTeacher, getLessonAverageRating } from "@/actions/lessonActions";
import { getLeaderboardDataForTeacher, getTeacherDashboardStats } from "@/actions/teacherActions";
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
import { ChevronDown } from "lucide-react";
import TeacherClassLeaderboard from "@/app/components/TeacherClassLeaderboard";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import prisma from "@/lib/prisma";
import TeacherStatsHeader from "@/app/components/TeacherStatsHeader";

export const dynamic = "force-dynamic";

// Match the prop shape expected by <TeacherPreferences>
type SerializableUser = Omit<User, "defaultLessonPrice"> & {
  defaultLessonPrice: number | null;
};

export default async function DashboardPage() {
  const session = await auth();

  if (!session) redirect("/signin");
  if (session.user.role === Role.STUDENT) redirect("/my-lessons");
  if (session.user.role !== Role.TEACHER && session.user.role !== Role.ADMIN) redirect("/");

  const teacher = await prisma.user.findUnique({
    where: { id: session.user.id }
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

  const [lessons, leaderboardData, stats] = await Promise.all([
    getLessonsForTeacher(session.user.id),
    getLeaderboardDataForTeacher(session.user.id),
    getTeacherDashboardStats(session.user.id),
  ]);

  const lessonsWithRatings = await Promise.all(
    lessons.map(async (lesson) => {
      // Convert lesson price from Decimal to number
      const price = lesson.price
        ? Number(lesson.price.toString())
        : 0;

      const averageRating = (await getLessonAverageRating(lesson.id)) ?? null;

      return { ...lesson, price, averageRating };
    })
  );

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
      <TeacherLessonList lessons={lessonsWithRatings} />

      <Accordion type="single" collapsible className="w-full mt-8">
        <AccordionItem value="lesson-defaults">
          <AccordionTrigger>Lesson Defaults</AccordionTrigger>
          <AccordionContent>
            {/* Pass the SERIALIZED object, not the raw Prisma result */}
            <TeacherPreferences teacher={serializableTeacher} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="mt-8">
        <TeacherClassLeaderboard leaderboardData={leaderboardData} />
      </div>
    </div>
  );
}