import { Prisma, PointReason } from '@prisma/client'
import prisma from '@/lib/prisma'
import { validateAssignmentForSubmission } from '@/lib/assignmentValidation'
import { revalidateStudentAssignmentViews } from '@/lib/cache-tags'

export async function findStudentAssignment<T extends Prisma.AssignmentFindFirstArgs>(
  studentId: string,
  assignmentId: string,
  args?: T
): Promise<Prisma.AssignmentGetPayload<T> | null> {
  const where = {
    id: assignmentId,
    studentId,
    ...((args as { where?: Prisma.AssignmentWhereInput } | undefined)?.where ?? {}),
  }
  const { where: _ignoredWhere, ...rest } = args ?? {}

  return prisma.assignment.findFirst({
    ...rest,
    where,
  } as Prisma.AssignmentFindFirstArgs) as Promise<Prisma.AssignmentGetPayload<T> | null>
}

export function assertAssignmentEditable(
  assignment: { status: string } | null
): { ok: true } | { ok: false; error: string } {
  if (!assignment) {
    return { ok: false, error: 'Assignment not found or unauthorized.' }
  }

  if (assignment.status !== 'PENDING') {
    return { ok: false, error: 'Assignment can no longer be edited.' }
  }

  return { ok: true }
}

export function assertAssignmentSubmittable(
  assignment: { status: unknown; deadline: unknown } | null
): { ok: true } | { ok: false; error: string; reason?: 'deadline' | 'status' } {
  if (!assignment) {
    return { ok: false, error: 'Assignment not found or unauthorized.' }
  }

  const validation = validateAssignmentForSubmission({
    status: assignment.status as never,
    deadline: assignment.deadline as never,
  })

  if (!validation.ok) {
    return { ok: false, error: validation.error, reason: validation.reason }
  }

  return { ok: true }
}

type SaveDraftParams = {
  assignmentId: string
  studentId: string
  data: Prisma.AssignmentUpdateInput
}

export async function saveAssignmentDraft({ assignmentId, studentId, data }: SaveDraftParams) {
  const assignment = await findStudentAssignment(studentId, assignmentId, {
    select: {
      id: true,
      status: true,
      lessonId: true,
    },
  })

  const editable = assertAssignmentEditable(assignment)
  if (!editable.ok) {
    return { success: false, error: editable.error }
  }

  await prisma.assignment.update({
    where: { id: assignmentId },
    data,
  })

  revalidateStudentAssignmentViews({
    assignmentId,
    studentId,
    lessonId: assignment?.lessonId ?? null,
  })

  return { success: true }
}

type RecordPointsDeltaParams = {
  tx: Prisma.TransactionClient
  userId: string
  assignmentId?: string
  pointsDelta: number
  amountEuro?: Prisma.Decimal | number
  reason: PointReason
  note: string
}

export async function recordPointsDelta({
  tx,
  userId,
  assignmentId,
  pointsDelta,
  amountEuro,
  reason,
  note,
}: RecordPointsDeltaParams) {
  const updatedUser = await tx.user.update({
    where: { id: userId },
    data: { totalPoints: { increment: pointsDelta } },
    select: { totalPoints: true },
  })

  await tx.pointTransaction.create({
    data: {
      userId,
      assignmentId,
      points: pointsDelta,
      amountEuro,
      reason,
      note,
    },
  })

  return updatedUser.totalPoints
}
