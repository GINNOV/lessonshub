import { randomUUID } from 'node:crypto'
import { AssignmentStatus } from '@prisma/client'
import { decimalToNullableNumber, decimalToNumber } from './decimal'
import { serializeStudentLesson, type SerializedStudentLesson } from './lesson'
import { serializeUserDecimalFields } from './user'

export type SerializedLyricLine = {
  id: string
  text: string
  startTime: number | null
  endTime: number | null
  hiddenWords?: string[]
}

type LyricConfigLike = Record<string, unknown> & {
  lines?: unknown
  settings?: unknown
}

type LyricAttemptLike = Record<string, unknown> & {
  id: string
  scorePercent?: unknown
  timeTakenSeconds?: unknown
  answers?: unknown
  readModeSwitchesUsed?: unknown
  createdAt: Date | string
}

type AssignmentLessonLike = Record<string, unknown> & {
  price?: unknown
  newsArticleConfig?: Record<string, unknown> | null
  lyricConfig?: LyricConfigLike | null
  lyricAttempts?: LyricAttemptLike[] | null
}

type StudentAssignmentLike = Record<string, unknown> & {
  id: string
  lesson: AssignmentLessonLike
  pointsAwarded?: unknown
  teacherAnswerComments?: unknown
}

type AssignmentSetOptions = {
  marketplacePurchasedIds?: Set<string>
  extendedAssignmentIds?: Set<string>
  includeLessonCounts?: boolean
}

export type SerializedStudentAssignment<T extends StudentAssignmentLike = StudentAssignmentLike> = Omit<
  T,
  'lesson' | 'pointsAwarded' | 'teacherAnswerComments'
> & {
  lesson: SerializedStudentLesson
  pointsAwarded: number
  marketplacePurchased: boolean
  extensionUsed: boolean
  teacherAnswerComments: unknown | null
}

const submittedStatuses = new Set<AssignmentStatus>([
  AssignmentStatus.COMPLETED,
  AssignmentStatus.GRADED,
  AssignmentStatus.FAILED,
])

export function normalizeLyricLines(value: unknown): SerializedLyricLine[] {
  if (!Array.isArray(value)) return []

  const normalized: SerializedLyricLine[] = []
  value.forEach((item) => {
    if (!item || typeof item !== 'object') return
    const record = item as Record<string, unknown>
    const text = typeof record.text === 'string' ? record.text : ''
    if (!text.trim()) return
    const id = typeof record.id === 'string' ? record.id : randomUUID()
    const startTimeValue =
      typeof record.startTime === 'number'
        ? record.startTime
        : typeof record.startTime === 'string' && record.startTime.trim()
          ? Number(record.startTime)
          : null
    const endTimeValue =
      typeof record.endTime === 'number'
        ? record.endTime
        : typeof record.endTime === 'string' && record.endTime.trim()
          ? Number(record.endTime)
          : null
    const hiddenWords =
      Array.isArray(record.hiddenWords)
        ? record.hiddenWords.filter((word): word is string => typeof word === 'string' && word.trim().length > 0)
        : undefined
    const startTime = Number.isFinite(startTimeValue) ? Number(startTimeValue) : null
    const endTime = Number.isFinite(endTimeValue) ? Number(endTimeValue) : null

    normalized.push({
      id,
      text,
      startTime,
      endTime,
      hiddenWords,
    })
  })

  return normalized
}

export function serializeLyricAttempts(attempts: unknown) {
  if (!Array.isArray(attempts)) return []

  return attempts.map((attempt) => {
    const record = attempt as LyricAttemptLike
    return {
      id: record.id,
      scorePercent: decimalToNullableNumber(record.scorePercent),
      timeTakenSeconds: typeof record.timeTakenSeconds === 'number' ? record.timeTakenSeconds : null,
      answers: (record.answers as Record<string, string[]> | null) ?? null,
      readModeSwitchesUsed: typeof record.readModeSwitchesUsed === 'number' ? record.readModeSwitchesUsed : null,
      createdAt: record.createdAt instanceof Date ? record.createdAt.toISOString() : new Date(record.createdAt).toISOString(),
    }
  })
}

export function serializeStudentAssignment<T extends StudentAssignmentLike>(assignment: T, options: AssignmentSetOptions = {}): SerializedStudentAssignment<T> {
  const lesson = serializeStudentLesson(assignment.lesson, {
    includeQuestionCount: Boolean(options.includeLessonCounts),
    includeMultiChoiceCount: Boolean(options.includeLessonCounts),
  })

  return {
    ...assignment,
    pointsAwarded: decimalToNumber(assignment.pointsAwarded),
    marketplacePurchased: options.marketplacePurchasedIds?.has(assignment.id) ?? false,
    extensionUsed: options.extendedAssignmentIds?.has(assignment.id) ?? false,
    teacherAnswerComments: assignment.teacherAnswerComments ?? null,
    lesson,
  }
}

export function serializeStudentAssignments<T extends StudentAssignmentLike>(assignments: T[], options: AssignmentSetOptions = {}) {
  return assignments.map((assignment) => serializeStudentAssignment(assignment, options))
}

export function serializeAssignmentForStudentPage<T extends StudentAssignmentLike>(assignment: T) {
  return {
    ...assignment,
    lesson: {
      ...assignment.lesson,
      price: decimalToNumber(assignment.lesson.price),
      newsArticleConfig: assignment.lesson.newsArticleConfig
        ? {
            markdown: assignment.lesson.newsArticleConfig.markdown,
            maxWordTaps: assignment.lesson.newsArticleConfig.maxWordTaps ?? null,
          }
        : null,
      lyricConfig: assignment.lesson.lyricConfig
        ? {
            ...assignment.lesson.lyricConfig,
            lines: normalizeLyricLines(assignment.lesson.lyricConfig.lines),
            settings: assignment.lesson.lyricConfig.settings ?? null,
          }
        : null,
      lyricAttempts: serializeLyricAttempts(assignment.lesson.lyricAttempts),
    },
    answers: assignment.answers as any,
    lyricDraftAnswers: normalizeLyricDraftAnswers((assignment as { lyricDraftAnswers?: unknown }).lyricDraftAnswers),
    lyricDraftMode: normalizeLyricDraftMode((assignment as { lyricDraftMode?: unknown }).lyricDraftMode),
    lyricDraftReadSwitches: normalizeLyricDraftReadSwitches((assignment as { lyricDraftReadSwitches?: unknown }).lyricDraftReadSwitches),
    lyricDraftUpdatedAt: (assignment as { lyricDraftUpdatedAt?: unknown }).lyricDraftUpdatedAt,
  }
}

export function serializeSubmissionForGrading<T extends Record<string, unknown> & {
  student: Record<string, unknown>
  teacher?: Record<string, unknown> | null
  lesson: AssignmentLessonLike
  lyricDraftAnswers?: unknown
  lyricDraftMode?: unknown
  lyricDraftReadSwitches?: unknown
  lyricDraftUpdatedAt?: unknown
}>(submission: T) {
  return {
    ...submission,
    student: serializeUserDecimalFields(submission.student),
    teacher: serializeUserDecimalFields(submission.teacher ?? null),
    lesson: {
      ...submission.lesson,
      price: decimalToNumber(submission.lesson.price),
      lyricConfig: submission.lesson.lyricConfig
        ? {
            ...submission.lesson.lyricConfig,
            lines: normalizeLyricLines(submission.lesson.lyricConfig.lines),
            settings: submission.lesson.lyricConfig.settings ?? null,
          }
        : null,
      lyricAttempts: serializeLyricAttempts(submission.lesson.lyricAttempts),
    },
    lyricDraftAnswers: normalizeLyricDraftAnswers(submission.lyricDraftAnswers),
    lyricDraftMode: normalizeLyricDraftMode(submission.lyricDraftMode),
    lyricDraftReadSwitches: normalizeLyricDraftReadSwitches(submission.lyricDraftReadSwitches),
    lyricDraftUpdatedAt: submission.lyricDraftUpdatedAt,
  }
}

export function normalizeLyricDraftAnswers(value: unknown): Record<string, string[]> | null {
  if (!value || typeof value !== 'object') return null
  const result: Record<string, string[]> = {}
  let hasEntries = false
  Object.entries(value as Record<string, unknown>).forEach(([key, raw]) => {
    if (!Array.isArray(raw)) return
    const arr = raw.every(item => typeof item === 'string')
      ? (raw as string[])
      : raw.map(item => (item === null || item === undefined ? '' : String(item)))
    result[key] = arr
    hasEntries = true
  })
  return hasEntries ? result : null
}

export function normalizeLyricDraftMode(value: unknown) {
  return value === 'read' || value === 'fill' ? value : null
}

export function normalizeLyricDraftReadSwitches(value: unknown) {
  return typeof value === 'number' ? value : null
}
