export const runtime = 'nodejs'

import { LessonType } from '@prisma/client'
import { NextResponse } from 'next/server'

import { autoAssignLessonToAllStudents } from '@/lib/lessonAssignments'
import prisma from '@/lib/prisma'
import { authenticateAutomationRequest } from '@/lib/automationTokens'
import { parseMultiChoiceLessonPayload } from '@/lib/multiChoiceLessonPayload'
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

  const parsed = parseMultiChoiceLessonPayload(body, { requireTopic: true })
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
      questions,
      price,
      difficulty,
      lesson_preview,
      assignment_text,
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
        type: LessonType.MULTI_CHOICE,
        teacherId: automationAuth.owner.id,
        context_text: topic,
        lesson_preview,
        assignment_text,
        assignment_image_url,
        soundcloud_url,
        attachment_url,
        notes,
        price,
        difficulty,
        assignment_notification: assignmentNotification,
        scheduled_assignment_date: scheduledAssignmentDate,
        isFreeForAll,
        multiChoiceQuestions: {
          create: questions.map((question) => ({
            question: question.question,
            options: {
              create: question.options.map((option) => ({
                text: option.text,
                isCorrect: option.isCorrect,
              })),
            },
          })),
        },
      },
      include: {
        multiChoiceQuestions: {
          include: {
            options: true,
          },
        },
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
    console.error('AUTOMATION_MULTI_CHOICE_LESSON_CREATE_ERROR', error)
    return NextResponse.json(
      { error: 'Failed to create multi-choice lesson.' },
      { status: 500 }
    )
  }
}
