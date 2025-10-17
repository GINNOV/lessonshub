import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getInitials, cn } from '@/lib/utils';

export default async function TeachersPage() {
  const session = await auth();
  if (!session) {
    redirect('/signin');
  }

  const teachers = await prisma.user.findMany({
    where: { role: Role.TEACHER },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      teacherBio: true,
      isSuspended: true,
      _count: {
        select: {
          lessons: true,
          students: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  const serializableTeachers = teachers.map((teacher) => ({
    id: teacher.id,
    name: teacher.name || teacher.email,
    email: teacher.email,
    image: teacher.image,
    about: teacher.teacherBio || '',
    lessonsCount: teacher._count.lessons,
    studentCount: teacher._count.students,
    isSuspended: teacher.isSuspended,
  }));

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-wide text-muted-foreground">Teachers</p>
        <h1 className="text-3xl font-bold">Meet Your Teachers</h1>
        <p className="text-muted-foreground">
          Learn more about the teachers guiding your lessons. Each profile is maintained by the teacher and visible to every logged-in student.
        </p>
      </header>

      <div className="grid gap-6 sm:grid-cols-2">
        {serializableTeachers.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
            No teachers are available yet. Check back soon!
          </p>
        ) : (
          serializableTeachers.map((teacher) => (
            <Card key={teacher.id} id={teacher.id} className={cn('h-full border', teacher.isSuspended && 'opacity-60')}>
              <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={teacher.image || ''} alt={teacher.name} />
                  <AvatarFallback>{getInitials(teacher.name)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-1 flex-col">
                  <CardTitle className="text-lg">{teacher.name}</CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="outline">Teacher</Badge>
                    {teacher.isSuspended && <Badge variant="destructive">Temporarily inactive</Badge>}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">About</h2>
                  <p className="mt-1 whitespace-pre-line text-sm text-gray-700">
                    {teacher.about ? teacher.about : 'This teacher has not shared any details yet.'}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs uppercase tracking-wide text-muted-foreground">
                  <span>{teacher.studentCount} students</span>
                  <span>&bull;</span>
                  <span>{teacher.lessonsCount} lessons</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
