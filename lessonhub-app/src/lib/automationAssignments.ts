import { AssignmentStatus, Prisma } from '@prisma/client'

import prisma from '@/lib/prisma'
import { createButton } from '@/lib/email-templates'
import { sendEmail } from '@/lib/email-templates.server'
import { getImmediateStartStudentIds } from '@/lib/assignmentNotifications'
import type { AutomationNotificationOption, ParsedAutomationAssignmentPayload } from '@/lib/automationAssignmentPayload'

type TeacherOwner = {
  id: string
  name: string | null
}

type ApplyAutomationAssignmentsArgs = {
  lessonId: string
  lessonTitle: string
  teacher: TeacherOwner
  assignment: ParsedAutomationAssignmentPayload
}

const formatDeadline = (deadline: Date, timeZone?: string | null) => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: timeZone || undefined,
    }).format(deadline)
  } catch {
    return deadline.toLocaleString()
  }
}

async function sendAssignmentEmail(args: {
  assignmentId: string
  studentEmail: string
  studentName: string | null
  studentTimeZone: string | null
  lessonTitle: string
  teacherName: string | null
  deadline: Date
}) {
  const assignmentUrl = `${process.env.AUTH_URL}/assignments/${args.assignmentId}`
  await sendEmail({
    to: args.studentEmail,
    templateName: 'new_assignment',
    data: {
      studentName: args.studentName || 'student',
      teacherName: args.teacherName || 'Your Teacher',
      lessonTitle: args.lessonTitle,
      deadline: formatDeadline(args.deadline, args.studentTimeZone),
      button: createButton('Start Lesson', assignmentUrl),
    },
  })
}

function defaultDeadlineFrom(startDate: Date) {
  return new Date(startDate.getTime() + 36 * 60 * 60 * 1000)
}

function shouldNotifyImmediately(option: AutomationNotificationOption) {
  return option === 'immediate'
}

function shouldNotifyOnStartDate(option: AutomationNotificationOption) {
  return option === 'on_start_date'
}

export async function applyAutomationAssignments({
  lessonId,
  lessonTitle,
  teacher,
  assignment,
}: ApplyAutomationAssignmentsArgs) {
  const links = await prisma.teachersForStudent.findMany({
    where: {
      teacherId: teacher.id,
      OR: [
        ...(assignment.studentIds.length ? [{ studentId: { in: assignment.studentIds } }] : []),
        ...(assignment.classIds.length ? [{ classId: { in: assignment.classIds } }] : []),
      ],
    },
    include: {
      student: {
        select: {
          id: true,
          email: true,
          name: true,
          timeZone: true,
          isSuspended: true,
        },
      },
      class: {
        select: {
          id: true,
          name: true,
          isActive: true,
        },
      },
    },
  })

  const unresolvedStudentIds = assignment.studentIds.filter(
    (studentId) => !links.some((link) => link.studentId === studentId)
  )
  if (unresolvedStudentIds.length > 0) {
    return {
      ok: false as const,
      status: 400,
      error: `Some studentIds are not assigned to this teacher: ${unresolvedStudentIds.join(', ')}`,
    }
  }

  const invalidClassIds = assignment.classIds.filter(
    (classId) =>
      !links.some((link) => link.classId === classId && link.class?.isActive)
  )
  if (invalidClassIds.length > 0) {
    return {
      ok: false as const,
      status: 400,
      error: `Some classIds are not active classes for this teacher: ${invalidClassIds.join(', ')}`,
    }
  }

  const studentMap = new Map(
    links
      .filter((link) => !link.student.isSuspended)
      .map((link) => [
        link.studentId,
        {
          id: link.student.id,
          email: link.student.email,
          name: link.student.name,
          timeZone: link.student.timeZone,
        },
      ])
  )

  const targetedStudents = Array.from(studentMap.values())
  if (targetedStudents.length === 0) {
    return {
      ok: false as const,
      status: 400,
      error: 'No eligible students were resolved from the provided assignment targets.',
    }
  }

  const now = new Date()
  const startDate = assignment.startDate ?? now
  const deadline = assignment.deadline ?? defaultDeadlineFrom(startDate)
  const notifyOnStartDate = shouldNotifyOnStartDate(assignment.notificationOption)

  const existingAssignments = await prisma.assignment.findMany({
    where: {
      lessonId,
      studentId: { in: targetedStudents.map((student) => student.id) },
    },
    select: {
      id: true,
      studentId: true,
      pointsAwarded: true,
      deadline: true,
      originalDeadline: true,
      notifyOnStartDate: true,
      student: {
        select: { totalPoints: true },
      },
    },
  })
  const existingByStudentId = new Map(existingAssignments.map((assignment) => [assignment.studentId, assignment]))

  const createdStudentIds: string[] = []
  const reassignedStudentIds: string[] = []

  for (const student of targetedStudents) {
    const existing = existingByStudentId.get(student.id)
    if (!existing) {
      await prisma.assignment.create({
        data: {
          lessonId,
          studentId: student.id,
          startDate,
          deadline,
          originalDeadline: deadline,
          notifyOnStartDate,
        },
      })
      createdStudentIds.push(student.id)
      continue
    }

    if (!assignment.reassignExisting) {
      continue
    }

    const pointsToRemove = existing.pointsAwarded ?? 0
    await prisma.$transaction(async (tx) => {
      if (pointsToRemove > 0) {
        const currentTotal = existing.student?.totalPoints ?? 0
        await tx.user.update({
          where: { id: student.id },
          data: { totalPoints: Math.max(0, currentTotal - pointsToRemove) },
        })
        await tx.pointTransaction.deleteMany({
          where: { assignmentId: existing.id },
        })
      }

      await tx.assignment.update({
        where: { lessonId_studentId: { lessonId, studentId: student.id } },
        data: {
          assignedAt: new Date(),
          startDate,
          deadline,
          originalDeadline: deadline,
          status: AssignmentStatus.PENDING,
          score: null,
          gradedAt: null,
          studentNotes: null,
          rating: null,
          answers: Prisma.DbNull,
          draftAnswers: Prisma.DbNull,
          draftStudentNotes: null,
          draftRating: null,
          draftUpdatedAt: null,
          teacherComments: null,
          teacherAnswerComments: Prisma.DbNull,
          pointsAwarded: 0,
          extraPoints: 0,
          reminderSentAt: null,
          milestoneNotified: false,
          notifyOnStartDate,
          pastDueWarningSentAt: null,
          gradedByTeacher: false,
          lyricDraftAnswers: Prisma.DbNull,
          lyricDraftMode: null,
          lyricDraftReadSwitches: null,
          lyricDraftUpdatedAt: null,
        },
      })
    })
    reassignedStudentIds.push(student.id)
  }

  const assignedStudentIds = assignment.reassignExisting
    ? [...createdStudentIds, ...reassignedStudentIds]
    : createdStudentIds

  if (assignedStudentIds.length === 0) {
    return {
      ok: true as const,
      assignedStudentIds: [],
      createdCount: 0,
      reassignedCount: 0,
      skippedExistingCount: targetedStudents.length,
    }
  }

  const freshAssignments = await prisma.assignment.findMany({
    where: {
      lessonId,
      studentId: { in: assignedStudentIds },
    },
    select: {
      id: true,
      studentId: true,
      deadline: true,
      startDate: true,
      notifyOnStartDate: true,
    },
  })
  const assignmentByStudentId = new Map(freshAssignments.map((item) => [item.studentId, item]))

  if (shouldNotifyImmediately(assignment.notificationOption)) {
    for (const studentId of assignedStudentIds) {
      const student = studentMap.get(studentId)
      const createdAssignment = assignmentByStudentId.get(studentId)
      if (!student?.email || !createdAssignment) continue
      await sendAssignmentEmail({
        assignmentId: createdAssignment.id,
        studentEmail: student.email,
        studentName: student.name,
        studentTimeZone: student.timeZone,
        lessonTitle,
        teacherName: teacher.name,
        deadline: createdAssignment.deadline,
      })
    }
  }

  if (notifyOnStartDate) {
    const dueNowStudentIds = getImmediateStartStudentIds(
      freshAssignments.map((item) => ({
        studentId: item.studentId,
        startDate: item.startDate,
      })),
      now
    )

    for (const studentId of dueNowStudentIds) {
      const student = studentMap.get(studentId)
      const createdAssignment = assignmentByStudentId.get(studentId)
      if (!student?.email || !createdAssignment) continue
      await sendAssignmentEmail({
        assignmentId: createdAssignment.id,
        studentEmail: student.email,
        studentName: student.name,
        studentTimeZone: student.timeZone,
        lessonTitle,
        teacherName: teacher.name,
        deadline: createdAssignment.deadline,
      })
      await prisma.assignment.update({
        where: { id: createdAssignment.id },
        data: { notifyOnStartDate: false },
      })
    }
  }

  return {
    ok: true as const,
    assignedStudentIds,
    createdCount: createdStudentIds.length,
    reassignedCount: reassignedStudentIds.length,
    skippedExistingCount: targetedStudents.length - assignedStudentIds.length,
  }
}
