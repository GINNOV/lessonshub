import { NextRequest, NextResponse } from 'next/server'
import { Role } from '@prisma/client'

import { auth } from '@/auth'
import { createAutomationToken } from '@/lib/automationTokenUtils'
import { hasAdminPrivileges } from '@/lib/authz'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || !hasAdminPrivileges(session.user)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const teacherId = request.nextUrl.searchParams.get('teacherId')?.trim() || undefined
  const tokens = await prisma.automationToken.findMany({
    where: {
      ...(teacherId ? { ownerId: teacherId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      tokenPrefix: true,
      label: true,
      ownerId: true,
      createdById: true,
      lastUsedAt: true,
      revokedAt: true,
      createdAt: true,
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })

  return NextResponse.json({ tokens })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || !hasAdminPrivileges(session.user)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const teacherId = typeof body.teacherId === 'string' ? body.teacherId.trim() : ''
  const label = typeof body.label === 'string' ? body.label.trim() : ''

  if (!teacherId) {
    return NextResponse.json({ error: 'teacherId is required.' }, { status: 400 })
  }

  const teacher = await prisma.user.findUnique({
    where: { id: teacherId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isSuspended: true,
    },
  })

  if (!teacher || teacher.role !== Role.TEACHER) {
    return NextResponse.json({ error: 'Automation tokens can only be granted to teachers.' }, { status: 400 })
  }

  if (teacher.isSuspended) {
    return NextResponse.json({ error: 'Cannot grant automation tokens to suspended teachers.' }, { status: 400 })
  }

  const generated = createAutomationToken()
  const tokenRecord = await prisma.automationToken.create({
    data: {
      tokenHash: generated.tokenHash,
      tokenPrefix: generated.tokenPrefix,
      label: label || null,
      ownerId: teacher.id,
      createdById: session.user.id,
    },
    select: {
      id: true,
      tokenPrefix: true,
      label: true,
      ownerId: true,
      createdById: true,
      createdAt: true,
    },
  })

  return NextResponse.json(
    {
      token: generated.token,
      automationToken: {
        ...tokenRecord,
        owner: {
          id: teacher.id,
          name: teacher.name,
          email: teacher.email,
        },
      },
    },
    { status: 201 }
  )
}
