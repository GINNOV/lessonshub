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
    if (isPastDue) return 'bg-red-700 text-red-100'; // Darker red for past due
    if (status === AssignmentStatus.PENDING) return 'bg-yellow-700 text-yellow-100'; // Darker yellow for pending
    if (status === AssignmentStatus.COMPLETED) return 'bg-blue-700 text-blue-100'; // Darker blue for completed
    if (status === AssignmentStatus.GRADED) return 'bg-green-700 text-green-100'; // Darker green for graded
    if (status === AssignmentStatus.FAILED) return 'bg-red-800 text-red-100'; // Even darker red for failed
    return 'bg-gray-700 text-gray-100'; // Darker gray default
  };

  const getLatestReminderDate = (reminderSentAt: Date | null, pastDueWarningSentAt: Date | null) => {
    if (!reminderSentAt) return pastDueWarningSentAt;
    if (!pastDueWarningSentAt) return reminderSentAt;
    return reminderSentAt > pastDueWarningSentAt ? reminderSentAt : pastDueWarningSentAt;
  };

  return (
    <div>
      <Button variant="link" asChild className="mb-4">
        <Link href="/dashboard">&larr; Back to Dashboard</Link>
      </Button>
      <h1 className="text-3xl font-bold">Submissions for: {lesson.title}</h1>
      <p className="mt-1 text-gray-600">{classLabel}: {classSummary}</p>

      <div className="mt-6">
        <div className="hidden md:block bg-card shadow-md rounded-lg overflow-hidden border border-border">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Student</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Due Date</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Score</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Reminder Sent</th>
                  <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {submissions.map((sub) => {
                  const isPastDue = new Date() > new Date(sub.deadline) && sub.status === AssignmentStatus.PENDING;
                  const isGradedByTeacher = (sub as any).gradedByTeacher === true;
                  const baseStatus = isGradedByTeacher
                    ? sub.status
                    : sub.status === AssignmentStatus.GRADED
                      ? AssignmentStatus.COMPLETED
                      : sub.status;
                  const displayStatus = isPastDue ? "PAST DUE" : baseStatus;
                  const reminderDate = getLatestReminderDate(sub.reminderSentAt ?? null, sub.pastDueWarningSentAt ?? null);

                  return (
                    <tr key={sub.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">{sub.student.name || sub.student.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusStyles(sub.status, isPastDue)}`}>
                          {displayStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground"><LocaleDate date={sub.deadline} /></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{sub.score ?? 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {reminderDate ? <LocaleDate date={reminderDate} /> : 'No'}
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
                          {baseStatus === AssignmentStatus.COMPLETED && (
                            <Button asChild size="sm">
                              <Link href={`/dashboard/grade/${sub.id}`}>Grade</Link>
                            </Button>
                          )}
                          {sub.status === AssignmentStatus.GRADED && isGradedByTeacher && (
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
          {submissions.length === 0 && <p className="p-6 text-center text-muted-foreground">No students have been assigned this lesson yet.</p>}
        </div>

        <div className="md:hidden space-y-4">
          {submissions.map((sub) => {
            const isPastDue = new Date() > new Date(sub.deadline) && sub.status === AssignmentStatus.PENDING;
            const isGradedByTeacher = (sub as any).gradedByTeacher === true;
            const baseStatus = isGradedByTeacher
              ? sub.status
              : sub.status === AssignmentStatus.GRADED
                ? AssignmentStatus.COMPLETED
                : sub.status;
            const displayStatus = isPastDue ? "PAST DUE" : baseStatus;
            const reminderDate = getLatestReminderDate(sub.reminderSentAt ?? null, sub.pastDueWarningSentAt ?? null);

            return (
              <div key={sub.id} className="bg-card shadow-sm rounded-lg border border-border p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-foreground">{sub.student.name || sub.student.email}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Due: <LocaleDate date={sub.deadline} />
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusStyles(sub.status, isPastDue)}`}>
                    {displayStatus}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Score</p>
                    <p className="font-medium text-foreground">{sub.score ?? 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Reminder Sent</p>
                    <p className="font-medium text-foreground">
                      {reminderDate ? <LocaleDate date={reminderDate} /> : 'No'}
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
                  {baseStatus === AssignmentStatus.COMPLETED && (
                    <Button asChild size="sm">
                      <Link href={`/dashboard/grade/${sub.id}`}>Grade</Link>
                    </Button>
                  )}
                  {sub.status === AssignmentStatus.GRADED && isGradedByTeacher && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/grade/${sub.id}`}>Edit Grade</Link>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}

          {submissions.length === 0 && (
            <p className="text-center text-muted-foreground">No students have been assigned this lesson yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
