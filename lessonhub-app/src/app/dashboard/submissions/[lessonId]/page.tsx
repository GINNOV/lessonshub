// file: src/app/dashboard/submissions/[lessonId]/page.tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getSubmissionsForLesson, getLessonById } from "@/actions/lessonActions";
import { Role, AssignmentStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import ReminderButton from "@/components/ReminderButton";
import FailButton from "@/app/components/FailButton";
import ExtendDeadlineButton from "@/app/components/ExtendDeadlineButton";
import LocaleDate from "@/app/components/LocaleDate";

export default async function SubmissionsPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== Role.TEACHER) {
    redirect("/");
  }

  const { lessonId } = await params;
  const submissions = await getSubmissionsForLesson(lessonId, session.user.id);
  const lesson = await getLessonById(lessonId);

  if (!lesson) {
    return <div className="p-8">Lesson not found.</div>;
  }

  const classSet = new Set<string>();
  let hasUnassigned = false;

  submissions.forEach((submission) => {
    const teacherRelations = submission.student.teachers ?? [];
    const names = teacherRelations
      .map((relation) => relation.class?.name)
      .filter((name): name is string => Boolean(name));

    if (names.length === 0) {
      hasUnassigned = true;
    }

    names.forEach((name) => classSet.add(name));
  });

  const orderedClassNames = Array.from(classSet).sort((a, b) => a.localeCompare(b));
  if (hasUnassigned || orderedClassNames.length === 0) {
    orderedClassNames.push('Unassigned');
  }

  const classLabel = orderedClassNames.length > 1 ? 'Classes' : 'Class';
  const classSummary = orderedClassNames.join(', ');

  const getStatusStyles = (status: AssignmentStatus | string, isPastDue: boolean) => {
    if (isPastDue) return 'bg-red-100 text-red-800';
    if (status === AssignmentStatus.PENDING) return 'bg-yellow-100 text-yellow-800';
    if (status === AssignmentStatus.COMPLETED) return 'bg-blue-100 text-blue-800';
    if (status === AssignmentStatus.GRADED) return 'bg-green-100 text-green-800';
    if (status === AssignmentStatus.FAILED) return 'bg-red-200 text-red-900';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div>
      <Button variant="link" asChild className="mb-4">
        <Link href="/dashboard">&larr; Back to Dashboard</Link>
      </Button>
      <h1 className="text-3xl font-bold">Submissions for: {lesson.title}</h1>
      <p className="mt-1 text-gray-600">{classLabel}: {classSummary}</p>

      <div className="mt-6">
        <div className="hidden md:block bg-white shadow-md rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reminder Sent</th>
                  <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {submissions.map((sub) => {
                  const isPastDue = new Date() > new Date(sub.deadline) && sub.status === AssignmentStatus.PENDING;
                  const displayStatus = isPastDue ? "PAST DUE" : sub.status;

                  return (
                    <tr key={sub.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{sub.student.name || sub.student.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusStyles(sub.status, isPastDue)}`}>
                          {displayStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"><LocaleDate date={sub.deadline} /></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sub.score ?? 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {sub.reminderSentAt ? <LocaleDate date={sub.reminderSentAt} /> : 'No'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2 flex-wrap">
                          {sub.status === AssignmentStatus.PENDING && !isPastDue && (
                            <ReminderButton assignmentId={sub.id} />
                          )}
                          {isPastDue && (
                            <>
                              <FailButton assignmentId={sub.id} />
                              <ExtendDeadlineButton assignmentId={sub.id} />
                            </>
                          )}
                          {sub.status === AssignmentStatus.COMPLETED && (
                            <Button asChild>
                              <Link href={`/dashboard/grade/${sub.id}`}>Grade</Link>
                            </Button>
                          )}
                          {sub.status === AssignmentStatus.GRADED && (
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/dashboard/grade/${sub.id}`}>Edit Grade</Link>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {submissions.length === 0 && <p className="p-6 text-center text-gray-500">No students have been assigned this lesson yet.</p>}
        </div>

        <div className="md:hidden space-y-4">
          {submissions.map((sub) => {
            const isPastDue = new Date() > new Date(sub.deadline) && sub.status === AssignmentStatus.PENDING;
            const displayStatus = isPastDue ? "PAST DUE" : sub.status;

            return (
              <div key={sub.id} className="bg-white shadow-sm rounded-lg border border-gray-100 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-gray-900">{sub.student.name || sub.student.email}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Due: <LocaleDate date={sub.deadline} />
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusStyles(sub.status, isPastDue)}`}>
                    {displayStatus}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Score</p>
                    <p className="font-medium text-gray-800">{sub.score ?? 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Reminder Sent</p>
                    <p className="font-medium text-gray-800">
                      {sub.reminderSentAt ? <LocaleDate date={sub.reminderSentAt} /> : 'No'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {sub.status === AssignmentStatus.PENDING && !isPastDue && (
                    <ReminderButton assignmentId={sub.id} />
                  )}
                  {isPastDue && (
                    <>
                      <FailButton assignmentId={sub.id} />
                      <ExtendDeadlineButton assignmentId={sub.id} />
                    </>
                  )}
                  {sub.status === AssignmentStatus.COMPLETED && (
                    <Button asChild size="sm">
                      <Link href={`/dashboard/grade/${sub.id}`}>Grade</Link>
                    </Button>
                  )}
                  {sub.status === AssignmentStatus.GRADED && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/grade/${sub.id}`}>Edit Grade</Link>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}

          {submissions.length === 0 && (
            <p className="text-center text-gray-500">No students have been assigned this lesson yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
