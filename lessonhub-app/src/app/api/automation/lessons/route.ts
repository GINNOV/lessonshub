export const runtime = 'nodejs'

import { NextResponse } from 'next/server'

import { autoAssignLessonToAllStudents } from '@/lib/lessonAssignments'
import prisma from '@/lib/prisma'
import { authenticateAutomationRequest } from '@/lib/automationTokens'
import { parseStandardLessonPayload } from '@/lib/standardLessonPayload'
import { parseAutomationAssignmentPayload } from '@/lib/automationAssignmentPayload'
import { applyAutomationAssignments } from '@/lib/automationAssignments'

export async function POST(request: Request) {
  const automationAuth = await authenticateAutomationRequest(request)
  if (!automationAuth.ok) {
    return NextResponse.json({ error: automationAuth.error }, { status: automationAuth.status })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const parsed = parseStandardLessonPayload(body, { requireTopic: true })
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }
  const assignmentParsed = parseAutomationAssignmentPayload(
    body && typeof body === 'object' ? (body as Record<string, unknown>).assignment : undefined
  )
  if (!assignmentParsed.ok) {
    return NextResponse.json({ error: assignmentParsed.error }, { status: 400 })
  }

  try {
    const {
      title,
      topic,
      assignmentText,
      questions,
      contextText,
      price,
      difficulty,
      lesson_preview,
      assignment_image_url,
      soundcloud_url,
      attachment_url,
      notes,
      assignmentNotification,
      scheduledAssignmentDate,
      isFreeForAll,
    } = parsed.data

    const lesson = await prisma.lesson.create({
      data: {
        title,
        teacherId: automationAuth.owner.id,
        assignment_text: assignmentText,
        questions,
        context_text: contextText ?? topic,
        lesson_preview,
        assignment_image_url,
        soundcloud_url,
        attachment_url,
        notes,
        price,
        difficulty,
        assignment_notification: assignmentNotification,
        scheduled_assignment_date: scheduledAssignmentDate,
        isFreeForAll,
      },
    })

    let assignmentResult:
      | {
          mode: 'default'
        }
      | {
          mode: 'targeted'
          createdCount: number
          reassignedCount: number
          skippedExistingCount: number
          assignedStudentIds: string[]
        } = { mode: 'default' }

    if (assignmentParsed.data) {
      const targeted = await applyAutomationAssignments({
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        teacher: automationAuth.owner,
        assignment: assignmentParsed.data,
      })

      if (!targeted.ok) {
        await prisma.lesson.delete({ where: { id: lesson.id } })
        return NextResponse.json({ error: targeted.error }, { status: targeted.status })
      }

      assignmentResult = {
        mode: 'targeted',
        createdCount: targeted.createdCount,
        reassignedCount: targeted.reassignedCount,
        skippedExistingCount: targeted.skippedExistingCount,
        assignedStudentIds: targeted.assignedStudentIds,
      }
    } else {
      await autoAssignLessonToAllStudents({
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        assignmentNotification,
        scheduledAssignmentDate,
        teacherName: automationAuth.owner.name,
      })
    }

    return NextResponse.json(
      {
        lesson,
        automation: {
          ownerId: automationAuth.owner.id,
          tokenId: automationAuth.tokenId,
          topic,
        },
        assignment: assignmentResult,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('AUTOMATION_STANDARD_LESSON_CREATE_ERROR', error)
    return NextResponse.json(
      { error: 'Failed to create standard lesson.' },
      { status: 500 }
    )
  }
}
