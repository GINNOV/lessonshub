import { auth } from '@/auth';
import { Role } from '@prisma/client';
import { redirect } from 'next/navigation';
import { getClassesForTeacher } from '@/actions/classActions';
import { getStudentsWithStats } from '@/actions/lessonActions';
import ClassManager from '@/app/components/ClassManager';

export default async function ClassesPage() {
  const session = await auth();
  if (!session || session.user.role !== Role.TEACHER) {
    redirect('/');
  }
  const [classes, students] = await Promise.all([
    getClassesForTeacher(),
    getStudentsWithStats(session.user.id),
  ]);
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Manage Classes</h1>
      <ClassManager initialClasses={classes} students={students} />
    </div>
  );
}

