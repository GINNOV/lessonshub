import { AssignmentNotification } from '@prisma/client'

type StandardQuestionInput = {
  question: string
  expectedAnswer: string
}

export type ParsedStandardLessonPayload = {
  title: string
  topic: string | null
  assignmentText: string
  questions: StandardQuestionInput[]
  contextText: string | null
  price: number
  difficulty: number
  lesson_preview: string | null
  assignment_image_url: string | null
  soundcloud_url: string | null
  attachment_url: string | null
  notes: string | null
  assignmentNotification: AssignmentNotification
  scheduledAssignmentDate: Date | null
  isFreeForAll: boolean
}

type ParseOptions = {
  requireTopic?: boolean
}

type ParseResult =
  | { ok: true; data: ParsedStandardLessonPayload }
  | { ok: false; error: string }

function optionalString(value: unknown) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

function optionalNumber(value: unknown, fallback: number) {
  if (value === null || value === undefined || value === '') return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

function parseQuestions(value: unknown): StandardQuestionInput[] | null {
  if (!Array.isArray(value) || value.length === 0) return null

  const questions = value
    .map((item) => {
      if (typeof item === 'string') {
        const question = optionalString(item)
        return question ? { question, expectedAnswer: '' } : null
      }

      if (!item || typeof item !== 'object') return null

      const record = item as Record<string, unknown>
      const question = optionalString(record.question)
      if (!question) return null

      return {
        question,
        expectedAnswer: optionalString(record.expectedAnswer) ?? '',
      }
    })
    .filter((question): question is StandardQuestionInput => question !== null)

  return questions.length === value.length ? questions : null
}

export function parseStandardLessonPayload(
  body: unknown,
  options: ParseOptions = {}
): ParseResult {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Invalid request body.' }
  }

  const payload = body as Record<string, unknown>
  const topic = optionalString(payload.topic)
  const title = optionalString(payload.title) ?? topic
  const assignmentText = optionalString(payload.assignmentText)

  if (!title) {
    return { ok: false, error: 'Title is required. You can also provide a topic to use as the title.' }
  }

  if (options.requireTopic && !topic) {
    return { ok: false, error: 'Topic is required for automation-created lessons.' }
  }

  if (!assignmentText) {
    return { ok: false, error: 'Assignment text is required.' }
  }

  const questions = parseQuestions(payload.questions)
  if (!questions) {
    return {
      ok: false,
      error: 'Questions must include at least one prompt.',
    }
  }

  const difficulty = optionalNumber(payload.difficulty, 3)
  if (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > 5) {
    return { ok: false, error: 'Difficulty must be an integer between 1 and 5.' }
  }

  const price = optionalNumber(payload.price, 0)
  if (!Number.isFinite(price) || price < 0) {
    return { ok: false, error: 'Price must be a number greater than or equal to 0.' }
  }

  const assignmentNotification = payload.assignment_notification
  if (
    assignmentNotification !== undefined &&
    !Object.values(AssignmentNotification).includes(
      assignmentNotification as AssignmentNotification
    )
  ) {
    return { ok: false, error: 'Invalid assignment notification value.' }
  }

  const scheduledAssignmentDate = payload.scheduled_assignment_date
    ? new Date(String(payload.scheduled_assignment_date))
    : null

  if (scheduledAssignmentDate && Number.isNaN(scheduledAssignmentDate.getTime())) {
    return { ok: false, error: 'A valid scheduled assignment date is required.' }
  }

  const resolvedAssignmentNotification =
    (assignmentNotification as AssignmentNotification | undefined) ??
    AssignmentNotification.NOT_ASSIGNED

  if (
    resolvedAssignmentNotification === AssignmentNotification.ASSIGN_ON_DATE &&
    !scheduledAssignmentDate
  ) {
    return { ok: false, error: 'A valid scheduled assignment date is required.' }
  }

  return {
    ok: true,
    data: {
      title,
      topic,
      assignmentText,
      questions,
      contextText: optionalString(payload.contextText) ?? topic,
      price,
      difficulty,
      lesson_preview: optionalString(payload.lesson_preview),
      assignment_image_url: optionalString(payload.assignment_image_url),
      soundcloud_url: optionalString(payload.soundcloud_url),
      attachment_url: optionalString(payload.attachment_url),
      notes: optionalString(payload.notes),
      assignmentNotification: resolvedAssignmentNotification,
      scheduledAssignmentDate,
      isFreeForAll: Boolean(payload.isFreeForAll),
    },
  }
}
