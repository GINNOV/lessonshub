import { describe, expect, it } from 'vitest'

import { parseAutomationAssignmentPayload } from '@/lib/automationAssignmentPayload'

describe('parseAutomationAssignmentPayload', () => {
  it('accepts studentIds and classIds with defaults', () => {
    const parsed = parseAutomationAssignmentPayload({
      studentIds: ['student-1'],
      classIds: ['class-1'],
    })

    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return

    expect(parsed.data?.notificationOption).toBe('on_start_date')
    expect(parsed.data?.reassignExisting).toBe(false)
  })

  it('rejects empty assignment targets', () => {
    const parsed = parseAutomationAssignmentPayload({
      studentIds: [],
      classIds: [],
    })

    expect(parsed).toEqual({
      ok: false,
      error: 'assignment must include at least one studentId or classId.',
    })
  })

  it('rejects unsupported notification options', () => {
    const parsed = parseAutomationAssignmentPayload({
      studentIds: ['student-1'],
      notificationOption: 'later',
    })

    expect(parsed).toEqual({
      ok: false,
      error: 'assignment.notificationOption must be one of immediate, on_start_date, or none.',
    })
  })
})
