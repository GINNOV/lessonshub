import { NextRequest } from 'next/server'

export function isAuthorizedCronRequest(request: NextRequest) {
  const configuredSecret = process.env.CRON_SECRET
  if (!configuredSecret) return true

  const secret = request.nextUrl.searchParams.get('secret')
  return secret === configuredSecret
}
