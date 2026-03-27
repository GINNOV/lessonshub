export type AutomationNotificationOption = 'immediate' | 'on_start_date' | 'none'

export type ParsedAutomationAssignmentPayload = {
  studentIds: string[]
  classIds: string[]
  startDate: Date | null
  deadline: Date | null
  notificationOption: AutomationNotificationOption
  reassignExisting: boolean
}

type ParseResult =
  | { ok: true; data: ParsedAutomationAssignmentPayload | null }
  | { ok: false; error: string }

function parseStringArray(value: unknown): string[] | null {
  if (value === undefined) return []
  if (!Array.isArray(value)) return null

  const items = value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)

  return items
}

export function parseAutomationAssignmentPayload(value: unknown): ParseResult {
  if (value === undefined || value === null) {
    return { ok: true, data: null }
  }

  if (typeof value !== 'object') {
    return { ok: false, error: 'assignment must be an object.' }
  }

  const payload = value as Record<string, unknown>
  const studentIds = parseStringArray(payload.studentIds)
  const classIds = parseStringArray(payload.classIds)

  if (!studentIds || !classIds) {
    return { ok: false, error: 'assignment.studentIds and assignment.classIds must be string arrays.' }
  }

  if (studentIds.length === 0 && classIds.length === 0) {
    return { ok: false, error: 'assignment must include at least one studentId or classId.' }
  }

  const notificationOption = payload.notificationOption
  if (
    notificationOption !== undefined &&
    notificationOption !== 'immediate' &&
    notificationOption !== 'on_start_date' &&
    notificationOption !== 'none'
  ) {
    return {
      ok: false,
      error: 'assignment.notificationOption must be one of immediate, on_start_date, or none.',
    }
  }

  const startDate = payload.startDate ? new Date(String(payload.startDate)) : null
  if (startDate && Number.isNaN(startDate.getTime())) {
    return { ok: false, error: 'assignment.startDate must be a valid date.' }
  }

  const deadline = payload.deadline ? new Date(String(payload.deadline)) : null
  if (deadline && Number.isNaN(deadline.getTime())) {
    return { ok: false, error: 'assignment.deadline must be a valid date.' }
  }

  return {
    ok: true,
    data: {
      studentIds,
      classIds,
      startDate,
      deadline,
      notificationOption: (notificationOption as AutomationNotificationOption | undefined) ?? 'on_start_date',
      reassignExisting: Boolean(payload.reassignExisting),
    },
  }
}
