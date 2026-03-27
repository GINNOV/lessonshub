import crypto from 'crypto'

const AUTOMATION_TOKEN_PREFIX = 'lhat_'
const TOKEN_DISPLAY_LENGTH = 12

export function hashAutomationToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function createAutomationToken() {
  const secret = crypto.randomBytes(32).toString('base64url')
  const token = `${AUTOMATION_TOKEN_PREFIX}${secret}`

  return {
    token,
    tokenHash: hashAutomationToken(token),
    tokenPrefix: token.slice(0, TOKEN_DISPLAY_LENGTH),
  }
}

export function readAutomationBearerToken(request: Request) {
  const header = request.headers.get('authorization')
  if (!header) return null

  const [scheme, token] = header.split(/\s+/, 2)
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null

  return token.trim() || null
}
