// file: src/app/dashboard/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getLessonsForTeacher } from "@/actions/lessonActions";
import { Role } from "@prisma/client";
import { Button } from "@/components/ui/button";
import TeacherLessonList from "@/app/components/TeacherLessonList";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();

  // Redirect users based on their role
  if (!session) {
    redirect("/signin");
  } else if (session.user.role === Role.STUDENT) {
    redirect("/my-lessons");
  } else if (session.user.role !== Role.TEACHER) {
    redirect("/");
  }

  const lessons = await getLessonsForTeacher(session.user.id);

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
      <TeacherLessonList lessons={lessons} />
    </div>
  );
}