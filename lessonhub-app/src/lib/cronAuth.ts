import { NextRequest } from 'next/server'

export function isAuthorizedCronRequest(request: NextRequest) {
  const configuredSecret = process.env.CRON_SECRET
  if (!configuredSecret) return true

  const authHeader = request.headers.get('authorization')
  if (authHeader === `Bearer ${configuredSecret}`) {
    return true
  }

  // Backward-compatible fallback for manual invocations or older config.
  const secret = request.nextUrl.searchParams.get('secret')
  return secret === configuredSecret
}
