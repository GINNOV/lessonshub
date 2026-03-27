import { Role } from '@prisma/client'

import prisma from '@/lib/prisma'
import { hashAutomationToken, readAutomationBearerToken } from '@/lib/automationTokenUtils'

export async function authenticateAutomationRequest(request: Request) {
  const token = readAutomationBearerToken(request)
  if (!token) {
    return {
      ok: false as const,
      status: 401,
      error: 'Missing automation bearer token.',
    }
  }

  const tokenHash = hashAutomationToken(token)
  const automationToken = await prisma.automationToken.findUnique({
    where: { tokenHash },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          role: true,
          isSuspended: true,
        },
      },
    },
  })

  if (!automationToken || automationToken.revokedAt) {
    return {
      ok: false as const,
      status: 401,
      error: 'Invalid automation token.',
    }
  }

  if (automationToken.owner.role !== Role.TEACHER || automationToken.owner.isSuspended) {
    return {
      ok: false as const,
      status: 403,
      error: 'Automation token is not allowed to create lessons for this user.',
    }
  }

  await prisma.automationToken.update({
    where: { id: automationToken.id },
    data: { lastUsedAt: new Date() },
  })

  return {
    ok: true as const,
    owner: automationToken.owner,
    tokenId: automationToken.id,
  }
}
