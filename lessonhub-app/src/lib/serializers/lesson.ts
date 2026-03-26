import { AssignmentStatus, LessonType } from '@prisma/client'
import { decimalToNumber } from './decimal'
import { serializeUserDecimalFields } from './user'

type LessonTeacher = Record<string, unknown> & {
  id: string
  name: string | null
  image: string | null
  defaultLessonPrice?: unknown
}

type LessonBase = Record<string, unknown> & {
  id?: string
  title?: string
  type?: LessonType
  lesson_preview?: string | null
  assignment_image_url?: string | null
  public_share_id?: string | null
  difficulty?: number
  composerConfig?: {
    hiddenSentence: string
  } | null
  price?: unknown
  teacher?: LessonTeacher | null
  assignments?: Array<{
    status?: AssignmentStatus
  }>
  _count?: {
    assignments?: number
    multiChoiceQuestions?: number
  }
  questions?: unknown
  isFreeForAll?: unknown
  guideIsFreeForAll?: unknown
}

type SerializeStudentLessonOptions = {
  includeQuestionCount?: boolean
  includeMultiChoiceCount?: boolean
}

export type SerializedStudentLesson = Record<string, unknown> & {
  id: string
  title: string
  type: LessonType
  lesson_preview: string | null
  assignment_image_url: string | null
  price: number
  isFreeForAll: boolean
  guideIsFreeForAll: boolean
  public_share_id: string | null
  completionCount: number
  submittedCount: number
  teacher: {
    id: string
    name: string | null
    image: string | null
    defaultLessonPrice: number | null
  } | null
  difficulty: number
  composerConfig?: {
    hiddenSentence: string
  } | null
  questionCount?: number
  multiChoiceCount?: number
}

function serializeStudentLessonTeacher(teacher: LessonTeacher | null | undefined) {
  if (!teacher) return null

  const serialized = serializeUserDecimalFields(teacher)
  if (!serialized) return null
  return {
    id: teacher.id,
    name: teacher.name,
    image: teacher.image,
    defaultLessonPrice: serialized?.defaultLessonPrice ?? null,
  }
}

export function serializeStudentLesson<T extends LessonBase>(lesson: T, options: SerializeStudentLessonOptions = {}): SerializedStudentLesson {
  const {
    id,
    title,
    type,
    lesson_preview,
    assignment_image_url,
    public_share_id,
    difficulty,
    composerConfig,
    _count,
    assignments: lessonAssignments,
    price,
    teacher,
    ...restOfLesson
  } = lesson

  const submittedStatuses = new Set<AssignmentStatus>([
    AssignmentStatus.COMPLETED,
    AssignmentStatus.GRADED,
    AssignmentStatus.FAILED,
  ])

  const submittedCount = (lessonAssignments || []).filter((lessonAssignment) =>
    submittedStatuses.has(lessonAssignment.status as AssignmentStatus)
  ).length
  const isFreeForAll =
    typeof (restOfLesson as { isFreeForAll?: unknown }).isFreeForAll === 'boolean'
      ? ((restOfLesson as { isFreeForAll?: boolean }).isFreeForAll ?? false)
      : false
  const guideIsFreeForAll =
    typeof (restOfLesson as { guideIsFreeForAll?: unknown }).guideIsFreeForAll === 'boolean'
      ? ((restOfLesson as { guideIsFreeForAll?: boolean }).guideIsFreeForAll ?? false)
      : false

  const serializedLesson: SerializedStudentLesson = {
    ...restOfLesson,
    id: id as string,
    title: title as string,
    type: type as LessonType,
    lesson_preview: lesson_preview ?? null,
    assignment_image_url: assignment_image_url ?? null,
    public_share_id: public_share_id ?? null,
    difficulty: typeof difficulty === 'number' ? difficulty : 0,
    composerConfig: composerConfig ?? null,
    price: decimalToNumber(price),
    isFreeForAll,
    guideIsFreeForAll,
    completionCount: _count?.assignments ?? 0,
    submittedCount,
    teacher: serializeStudentLessonTeacher(teacher),
  }

  if (options.includeQuestionCount) {
    const questions = (restOfLesson as { questions?: unknown }).questions
    serializedLesson.questionCount = Array.isArray(questions) ? questions.length : 0
  }

  if (options.includeMultiChoiceCount) {
    serializedLesson.multiChoiceCount = _count?.multiChoiceQuestions ?? 0
  }

  return serializedLesson
}
