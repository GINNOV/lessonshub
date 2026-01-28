// file: src/lib/lessonAssignments.ts
import prisma from '@/lib/prisma';
import { AssignmentNotification, Role } from '@prisma/client';
import { createButton } from '@/lib/email-templates';
import { sendEmail } from '@/lib/email-templates.server';

type AutoAssignOptions = {
  lessonId: string;
  lessonTitle: string;
  assignmentNotification: AssignmentNotification;
  scheduledAssignmentDate?: Date | null;
  teacherName?: string | null;
};

const formatDeadline = (deadline: Date, timeZone?: string | null) => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: timeZone || undefined,
    }).format(deadline);
  } catch {
    return deadline.toLocaleString();
  }
};

/**
 * Auto‑assigns a lesson to every student and optionally sends the "new assignment"
 * email depending on the selected notification mode.
 */
export async function autoAssignLessonToAllStudents({
  lessonId,
  lessonTitle,
  assignmentNotification,
  scheduledAssignmentDate,
  teacherName,
}: AutoAssignOptions) {
  if (assignmentNotification === AssignmentNotification.NOT_ASSIGNED) {
    return;
  }

  const students = await prisma.user.findMany({
    where: { role: Role.STUDENT },
    select: { id: true, email: true, name: true, timeZone: true },
  });

  if (students.length === 0) {
    return;
  }

  const now = new Date();
  const defaultDeadline = new Date(now.getTime() + 36 * 60 * 60 * 1000);
  const shouldNotifyOnStartDate = assignmentNotification === AssignmentNotification.ASSIGN_ON_DATE;
  const startDate =
    shouldNotifyOnStartDate && scheduledAssignmentDate ? scheduledAssignmentDate : now;

  await prisma.assignment.createMany({
    data: students.map((student) => ({
      lessonId,
      studentId: student.id,
      deadline: defaultDeadline,
      originalDeadline: defaultDeadline,
      startDate,
      notifyOnStartDate: shouldNotifyOnStartDate,
    })),
    skipDuplicates: true,
  });

  if (assignmentNotification !== AssignmentNotification.ASSIGN_AND_NOTIFY) {
    return;
  }

  const assignments = await prisma.assignment.findMany({
    where: {
      lessonId,
      studentId: { in: students.map((student) => student.id) },
    },
    select: { id: true, studentId: true },
  });
  const assignmentByStudentId = new Map(
    assignments.map((assignment) => [assignment.studentId, assignment.id]),
  );

  for (const student of students) {
    if (!student.email) continue;

    const assignmentId = assignmentByStudentId.get(student.id);
    const assignmentUrl = assignmentId
      ? `${process.env.AUTH_URL}/assignments/${assignmentId}`
      : `${process.env.AUTH_URL}/my-lessons`;
    const deadlineStr = formatDeadline(defaultDeadline, student.timeZone);
    await sendEmail({
      to: student.email,
      templateName: 'new_assignment',
      data: {
        studentName: student.name || 'student',
        teacherName: teacherName || 'Your Teacher',
        lessonTitle,
        deadline: deadlineStr,
        button: createButton('Start Lesson', assignmentUrl),
      },
    });
  }
}
