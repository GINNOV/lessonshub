// file: src/app/dashboard/assign/[lessonId]/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLessonById, getStudentsWithStats } from "@/actions/lessonActions";
import { getClassesForTeacher } from "@/actions/classActions";
import AssignLessonForm from "@/app/components/AssignLessonForm";
import { Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import { LessonDifficultyIndicator } from "@/app/components/LessonDifficultySelector";

export default async function AssignPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== Role.TEACHER) {
    redirect("/signin");
  }

  const { lessonId } = await params;
  const lesson = await getLessonById(lessonId);

  if (!lesson) {
    return <div>Lesson not found.</div>;
  }
  
  const serializableLesson = {
      ...lesson,
      price: lesson.price.toNumber(),
  };

  
  const [students, existingAssignments, calendarAssignments, classes] = await Promise.all([
    getStudentsWithStats(session.user.id),
    prisma.assignment.findMany({ where: { lessonId } }),
    prisma.assignment.findMany({
      where: {
        lesson: { teacherId: session.user.id },
      },
      select: {
        deadline: true,
        lessonId: true,
      },
    }),
    getClassesForTeacher(),
  ]);

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8">
      <div className="bg-card p-4 sm:p-8 rounded-lg shadow-md border">
        <h1 className="text-3xl font-bold mb-2">Assign Lesson</h1>
        <h2 className="text-lg sm:text-xl text-muted-foreground mb-6">{lesson.title}</h2>
        <LessonDifficultyIndicator value={serializableLesson.difficulty} size="md" className="mb-6" />
        <AssignLessonForm 
          lesson={serializableLesson} 
          students={students as any} 
          existingAssignments={existingAssignments}
          calendarAssignments={calendarAssignments}
          classes={(classes || []).map((c: any) => ({ id: c.id, name: c.name, isActive: c.isActive }))}
        />
      </div>
    </div>
  );
}
