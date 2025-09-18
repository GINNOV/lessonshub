// file: src/app/dashboard/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getLessonsForTeacher, getLessonAverageRating } from "@/actions/lessonActions";
import { getTeacherPreferences, getLeaderboardDataForTeacher } from "@/actions/teacherActions";
import { Role } from "@prisma/client";
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


export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/signin");
  } else if (session.user.role === Role.STUDENT) {
    redirect("/my-lessons");
  } else if (session.user.role !== Role.TEACHER) {
    redirect("/");
  }

  const [lessons, preferences, leaderboardData] = await Promise.all([
    getLessonsForTeacher(session.user.id),
    getTeacherPreferences(),
    getLeaderboardDataForTeacher(session.user.id),
  ]);

  const lessonsWithRatings = await Promise.all(
    lessons.map(async (lesson) => {
      const avgRating = await getLessonAverageRating(lesson.id);
      return {
        ...lesson,
        price: lesson.price.toNumber(),
        averageRating: avgRating,
      };
    })
  );
  
  const serializablePreferences = preferences ? {
      ...preferences,
      defaultLessonPrice: preferences.defaultLessonPrice?.toNumber() ?? 0,
  } : null;

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
          <p className="mt-1 text-gray-600">
            Welcome, {session.user?.name}!
          </p>
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
      <TeacherLessonList lessons={lessonsWithRatings} />
      
      <Accordion type="single" collapsible className="w-full mt-8">
        <AccordionItem value="item-1">
          <AccordionTrigger>Lesson Defaults</AccordionTrigger>
          <AccordionContent>
            <TeacherPreferences initialPreferences={serializablePreferences} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <TeacherClassLeaderboard leaderboardData={leaderboardData} />
    </div>
  );
}

