import { NextResponse } from 'next/server'

import { auth } from '@/auth'
import { hasAdminPrivileges } from '@/lib/authz'
import prisma from '@/lib/prisma'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || !hasAdminPrivileges(session.user)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { tokenId } = await params
  const existingToken = await prisma.automationToken.findUnique({
    where: { id: tokenId },
    select: { id: true, revokedAt: true },
  })

  if (!existingToken) {
    return NextResponse.json({ error: 'Automation token not found.' }, { status: 404 })
  }

  if (existingToken.revokedAt) {
    return NextResponse.json({ error: 'Automation token is already revoked.' }, { status: 400 })
  }

  const revokedToken = await prisma.automationToken.update({
    where: { id: tokenId },
    data: { revokedAt: new Date() },
    select: {
      id: true,
      tokenPrefix: true,
      label: true,
      ownerId: true,
      revokedAt: true,
    },
  })

  return NextResponse.json({ automationToken: revokedToken })
}
