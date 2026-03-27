export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

import { authenticateAutomationRequest } from '@/lib/automationTokens'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const automationAuth = await authenticateAutomationRequest(request)
  if (!automationAuth.ok) {
    return NextResponse.json({ error: automationAuth.error }, { status: automationAuth.status })
  }

  const title = request.nextUrl.searchParams.get('title')?.trim() || ''
  const classId = request.nextUrl.searchParams.get('classId')?.trim() || ''
  const className = request.nextUrl.searchParams.get('className')?.trim() || ''

  let existingLessonId: string | null = null
  if (title) {
    const lesson = await prisma.lesson.findFirst({
      where: {
        teacherId: automationAuth.owner.id,
        title,
      },
      select: { id: true },
    })
    existingLessonId = lesson?.id ?? null
  }

  let resolvedClassId: string | null = null
  if (classId) {
    const cls = await prisma.class.findFirst({
      where: {
        id: classId,
        teacherId: automationAuth.owner.id,
        isActive: true,
      },
      select: { id: true, name: true },
    })

    if (!cls) {
      return NextResponse.json(
        { error: `Class ${classId} was not found for this teacher.` },
        { status: 400 }
      )
    }

    resolvedClassId = cls.id
  } else if (className) {
    const cls = await prisma.class.findFirst({
      where: {
        name: className,
        teacherId: automationAuth.owner.id,
        isActive: true,
      },
      select: { id: true, name: true },
      orderBy: { createdAt: 'asc' },
    })

    if (!cls) {
      return NextResponse.json(
        { error: `Active class "${className}" was not found for this teacher.` },
        { status: 400 }
      )
    }

    resolvedClassId = cls.id
  }

  return NextResponse.json({
    owner: {
      id: automationAuth.owner.id,
      name: automationAuth.owner.name,
    },
    existingLessonId,
    resolvedClassId,
  })
}
