import { describe, expect, it } from 'vitest'

import {
  createAutomationToken,
  hashAutomationToken,
  readAutomationBearerToken,
} from '@/lib/automationTokenUtils'

describe('automationTokens', () => {
  it('creates prefixed tokens and stable hashes', () => {
    const generated = createAutomationToken()

    expect(generated.token.startsWith('lhat_')).toBe(true)
    expect(generated.tokenPrefix).toBe(generated.token.slice(0, 12))
    expect(generated.tokenHash).toBe(hashAutomationToken(generated.token))
  })

  it('reads bearer tokens from authorization headers', () => {
    const request = new Request('https://example.com', {
      headers: {
        authorization: 'Bearer secret-token',
      },
    })

    expect(readAutomationBearerToken(request)).toBe('secret-token')
  })

  it('rejects malformed authorization headers', () => {
    const request = new Request('https://example.com', {
      headers: {
        authorization: 'Basic abc123',
      },
    })

    expect(readAutomationBearerToken(request)).toBeNull()
  })
})
