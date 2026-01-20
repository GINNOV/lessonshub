export type MultiChoiceOption = {
  id: string
  text: string
  isCorrect?: boolean
}

export type MultiChoiceQuestion = {
  id: string
  options: MultiChoiceOption[]
}

export type MultiChoiceAnswer = {
  questionId?: string
  selectedAnswerId?: string | number | null
  selectedAnswerText?: string | null
  selectedAnswerIndex?: number | null
  isCorrect?: boolean | null
}

const normalizeOptionText = (value: string) => value.trim().toLowerCase()

export const parseMultiChoiceAnswers = (
  raw: unknown,
  questions: MultiChoiceQuestion[]
): Record<string, MultiChoiceAnswer> => {
  if (!raw) return {}
  const record: Record<string, MultiChoiceAnswer> = {}
  const knownQuestionIds = new Set(questions.map(question => question.id))

  const toBoolean = (value: unknown): boolean | null => {
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') {
      if (value > 0) return true
      if (value < 0) return false
      return null
    }
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase()
      if (['correct', 'right', 'true', 'yes', 'y', '1', 'pass'].includes(normalized)) return true
      if (['incorrect', 'wrong', 'false', 'no', 'n', '0', 'fail'].includes(normalized)) return false
    }
    return null
  }

  const extractSelectedValue = (value: unknown): unknown => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const obj = value as Record<string, unknown>
      const candidate =
        obj.id ??
        obj.value ??
        obj.text ??
        obj.label ??
        obj.optionId ??
        obj.option_id ??
        obj.selectedOptionId ??
        obj.selected_option_id ??
        obj.selectedAnswerId ??
        obj.selected_answer_id ??
        obj.answerId ??
        obj.answer_id ??
        obj.choice
      if (typeof candidate === 'string' || typeof candidate === 'number') {
        return candidate
      }
    }
    return value
  }

  const ensureEntry = (
    questionId: string | undefined,
    selected: unknown,
    correctness: unknown,
    fallbackIndex?: number,
    selectedText?: unknown,
    selectedIndex?: unknown
  ) => {
    const fallbackId =
      typeof fallbackIndex === 'number'
        ? questions[fallbackIndex]?.id
        : undefined
    const normalizedQuestionId = questionId && knownQuestionIds.has(questionId) ? questionId : undefined
    const resolvedId = normalizedQuestionId ?? fallbackId
    if (!resolvedId) return

    const targets = new Set<string>([resolvedId])
    if (fallbackId && fallbackId !== resolvedId) {
      targets.add(fallbackId)
    }

    const extractedSelection = (() => {
      if (selected === undefined) return undefined
      const value = extractSelectedValue(selected)
      if (value === null) return null
      if (typeof value === 'string' || typeof value === 'number') return value
      return undefined
    })()
    const boolValue = toBoolean(correctness)

    targets.forEach(id => {
      if (!record[id]) {
        record[id] = {
          questionId: id,
          selectedAnswerId: null,
          selectedAnswerText: null,
          selectedAnswerIndex: null,
          isCorrect: null,
        }
      }
      if (extractedSelection !== undefined) {
        record[id].selectedAnswerId = extractedSelection
      }
      if (typeof selectedText === 'string' && selectedText.trim()) {
        record[id].selectedAnswerText = selectedText.trim()
      }
      if (typeof selectedIndex === 'number' && Number.isFinite(selectedIndex)) {
        record[id].selectedAnswerIndex = selectedIndex
      }
      if (typeof selectedIndex === 'string' && selectedIndex.trim()) {
        const parsedIndex = Number(selectedIndex)
        if (Number.isFinite(parsedIndex)) {
          record[id].selectedAnswerIndex = parsedIndex
        }
      }
      if (boolValue !== null) {
        record[id].isCorrect = boolValue
      }
    })
  }

  const normalise = (value: unknown, fallbackIndex?: number) => {
    if (value === null || value === undefined) return
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (!trimmed) return
      try {
        normalise(JSON.parse(trimmed), fallbackIndex)
        return
      } catch {
        if (trimmed.includes(':')) {
          const [rawQuestionId, rawSelected] = trimmed.split(':', 2)
          const selectedValue = rawSelected ?? null
          ensureEntry(rawQuestionId || undefined, selectedValue, null, fallbackIndex)
        }
        return
      }
    }
    if (Array.isArray(value)) {
      if (value.length === 0) return
      if (
        value.length <= 4 &&
        (typeof value[0] === 'string' ||
          typeof value[0] === 'number' ||
          value[0] === null ||
          value[0] === undefined)
      ) {
        const [maybeQuestionId, maybeSelected, maybeCorrect, maybeSelectedText] = value
        const qid = typeof maybeQuestionId === 'string' ? maybeQuestionId : undefined
        ensureEntry(qid, maybeSelected, maybeCorrect, fallbackIndex, maybeSelectedText)
        return
      }
      value.forEach((item, index) => {
        normalise(item, index)
      })
      return
    }
    if (typeof value === 'object') {
      const obj = value as Record<string, unknown>
      if (Object.keys(obj).length === 0) return

      const questionIdCandidate = [
        obj.questionId,
        obj.question_id,
        obj.id,
        obj.promptId,
        obj.prompt_id,
        obj.key,
        obj.qid,
      ].find((candidate): candidate is string => typeof candidate === 'string')

      const rawSelectedCandidate = [
        obj.selectedAnswerId,
        obj.selected_answer_id,
        obj.answerId,
        obj.answer_id,
        obj.optionId,
        obj.option_id,
        obj.selectedOptionId,
        obj.selected_option_id,
        obj.selectedOption,
        obj.selected_option,
        obj.selected,
        obj.value,
        obj.choice,
        obj.response,
      ].find((candidate) => candidate !== undefined)

      const selectedTextCandidate = [
        obj.selectedAnswerText,
        obj.selected_answer_text,
        obj.selectedText,
        obj.selectedOptionText,
        obj.selected_option_text,
        obj.answerText,
        obj.answer_text,
        obj.optionText,
        obj.option_text,
        obj.answer,
        obj.text,
      ].find((candidate): candidate is string => typeof candidate === 'string')

      const selectedIndexCandidate = [
        obj.selectedAnswerIndex,
        obj.selected_answer_index,
        obj.selectedIndex,
        obj.answerIndex,
        obj.answer_index,
        obj.index,
        obj.optionIndex,
      ].find((candidate) => candidate !== undefined)

      const correctnessCandidate = [
        obj.isCorrect,
        obj.correct,
        obj.is_correct,
        obj.wasCorrect,
        obj.result,
        obj.status,
        obj.outcome,
        obj.passed,
      ].find((candidate) => candidate !== undefined)

      if (
        questionIdCandidate ||
        rawSelectedCandidate !== undefined ||
        correctnessCandidate !== undefined ||
        selectedTextCandidate ||
        selectedIndexCandidate !== undefined
      ) {
        ensureEntry(
          questionIdCandidate,
          rawSelectedCandidate,
          correctnessCandidate,
          fallbackIndex,
          selectedTextCandidate,
          selectedIndexCandidate
        )
        return
      }

      Object.entries(obj).forEach(([key, val]) => {
        if (val && typeof val === 'object') {
          normalise({ questionId: key, ...(val as Record<string, unknown>) }, fallbackIndex)
        } else {
          ensureEntry(key, val, undefined, fallbackIndex)
        }
      })
      return
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      ensureEntry(undefined, value, value, fallbackIndex)
    }
  }

  normalise(raw)
  return record
}

export const resolveSelectedOption = (
  question: MultiChoiceQuestion,
  answer?: MultiChoiceAnswer
) => {
  const selectedAnswerId = answer?.selectedAnswerId
  if (selectedAnswerId === null || selectedAnswerId === undefined) {
    if (typeof answer?.selectedAnswerIndex === 'number') {
      const zeroBased = question.options[answer.selectedAnswerIndex]
      if (zeroBased) return zeroBased
      const oneBased = question.options[answer.selectedAnswerIndex - 1]
      if (oneBased) return oneBased
    }
    if (typeof answer?.selectedAnswerText === 'string') {
      const normalized = normalizeOptionText(answer.selectedAnswerText)
      const byText = question.options.find(
        option => normalizeOptionText(option.text) === normalized
      )
      if (byText) return byText
    }
    return null
  }
  const selectedValue =
    typeof selectedAnswerId === 'string' || typeof selectedAnswerId === 'number'
      ? selectedAnswerId
      : null
  if (selectedValue === null) return null

  const byId = question.options.find(option => option.id === String(selectedValue))
  if (byId) return byId

  const numeric = typeof selectedValue === 'number' ? selectedValue : Number(selectedValue)
  if (Number.isFinite(numeric)) {
    const zeroBased = question.options[numeric]
    if (zeroBased) return zeroBased
    const oneBased = question.options[numeric - 1]
    if (oneBased) return oneBased
  }

  const byText = question.options.find(
    option => normalizeOptionText(option.text) === normalizeOptionText(String(selectedValue))
  )
  if (byText) return byText
  return null
}

export const resolveSelectedLabel = (
  question: MultiChoiceQuestion,
  answer?: MultiChoiceAnswer,
  selectedOption?: MultiChoiceOption | null
) => {
  if (selectedOption?.text) return selectedOption.text
  const selectedText = typeof answer?.selectedAnswerText === 'string' ? answer.selectedAnswerText.trim() : ''
  if (selectedText) return selectedText
  if (typeof answer?.selectedAnswerIndex === 'number') {
    const zeroBased = question.options[answer.selectedAnswerIndex]
    if (zeroBased) return zeroBased.text
    const oneBased = question.options[answer.selectedAnswerIndex - 1]
    if (oneBased) return oneBased.text
  }
  const rawValue = answer?.selectedAnswerId
  if (typeof rawValue === 'string' || typeof rawValue === 'number') {
    const rawText = String(rawValue)
    const byId = question.options.find(option => option.id === rawText)
    if (byId) return byId.text
    const byText = question.options.find(
      option => normalizeOptionText(option.text) === normalizeOptionText(rawText)
    )
    if (byText) return byText.text
    return rawText
  }
  return null
}
