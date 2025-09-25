// file: src/app/dashboard/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getLessonsForTeacher, getLessonAverageRating } from "@/actions/lessonActions";
import { getLeaderboardDataForTeacher } from "@/actions/teacherActions";
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
import prisma from "@/lib/prisma"; // Import prisma

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/signin");
  } else if (session.user.role === Role.STUDENT) {
    redirect("/my-lessons");
  } else if (session.user.role !== Role.TEACHER && session.user.role !== Role.ADMIN) {
    redirect("/");
  }

  // Fetch the full teacher object instead of just preferences
  const teacher = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!teacher) {
    // Handle case where teacher data might not be found
    return <div>Could not load teacher data. Please try again later.</div>;
  }

  const [lessons, leaderboardData] = await Promise.all([
    getLessonsForTeacher(session.user.id),
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
            {/* Pass the full teacher object to the component */}
            <TeacherPreferences teacher={teacher} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <TeacherClassLeaderboard leaderboardData={leaderboardData} />
    </div>
  );
}