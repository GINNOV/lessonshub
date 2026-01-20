import prisma from '@/lib/prisma'

type MultiChoiceAnswer = {
  questionId?: string
  selectedAnswerId?: string | number | null
  selectedAnswerText?: string | null
  selectedAnswerIndex?: number | null
  isCorrect?: boolean | null
}

const applyChanges = process.argv.includes('--apply')

const normalizeText = (value: string) => value.trim().toLowerCase()

const resolveOptionMatch = (
  options: Array<{ id: string; text: string }>,
  answer: MultiChoiceAnswer
) => {
  const selectedId =
    typeof answer.selectedAnswerId === 'string'
      ? answer.selectedAnswerId
      : typeof answer.selectedAnswerId === 'number'
      ? String(answer.selectedAnswerId)
      : null
  const selectedIndex =
    typeof answer.selectedAnswerIndex === 'number'
      ? answer.selectedAnswerIndex
      : typeof answer.selectedAnswerIndex === 'string'
      ? Number(answer.selectedAnswerIndex)
      : null
  const selectedText =
    typeof answer.selectedAnswerText === 'string'
      ? normalizeText(answer.selectedAnswerText)
      : ''

  if (selectedId) {
    const byId = options.find(option => option.id === selectedId)
    if (byId) return { option: byId, index: options.indexOf(byId) }
  }

  if (Number.isFinite(selectedIndex)) {
    const zeroBased = options[selectedIndex as number]
    if (zeroBased) return { option: zeroBased, index: options.indexOf(zeroBased) }
    const oneBased = options[(selectedIndex as number) - 1]
    if (oneBased) return { option: oneBased, index: options.indexOf(oneBased) }
  }

  if (selectedText) {
    const byText = options.find(option => normalizeText(option.text) === selectedText)
    if (byText) return { option: byText, index: options.indexOf(byText) }
  }

  return null
}

const run = async () => {
  const assignments = await prisma.assignment.findMany({
    where: { lesson: { type: 'MULTI_CHOICE' } },
    include: {
      lesson: {
        include: {
          multiChoiceQuestions: { include: { options: true } },
        },
      },
    },
  })

  let scanned = 0
  let updatedCount = 0
  const updatedIds: string[] = []

  for (const assignment of assignments) {
    scanned += 1
    if (!Array.isArray(assignment.answers)) continue
    if (!assignment.lesson?.multiChoiceQuestions?.length) continue

    const questions = assignment.lesson.multiChoiceQuestions
    const knownQuestionIds = new Set(questions.map(question => question.id))
    const updatedAnswers = assignment.answers.map((rawAnswer, index) => {
      if (!rawAnswer || typeof rawAnswer !== 'object') return rawAnswer
      const answer = { ...(rawAnswer as MultiChoiceAnswer) }
      const question = questions[index]
      if (!question) return answer

      const hasKnownQuestionId = answer.questionId && knownQuestionIds.has(answer.questionId)
      if (!hasKnownQuestionId) {
        answer.questionId = question.id
      }

      const match = resolveOptionMatch(question.options, answer)
      if (match) {
        if (answer.selectedAnswerId !== match.option.id) {
          answer.selectedAnswerId = match.option.id
        }
        if (answer.selectedAnswerIndex !== match.index) {
          answer.selectedAnswerIndex = match.index
        }
        if (!answer.selectedAnswerText) {
          answer.selectedAnswerText = match.option.text
        }
      }

      return answer
    })

    const changed = JSON.stringify(updatedAnswers) !== JSON.stringify(assignment.answers)
    if (!changed) continue

    updatedCount += 1
    updatedIds.push(assignment.id)
    if (applyChanges) {
      await prisma.assignment.update({
        where: { id: assignment.id },
        data: { answers: updatedAnswers },
      })
    }
  }

  console.log(JSON.stringify({
    scanned,
    updatedCount,
    updatedIds: updatedIds.slice(0, 50),
    updatedIdsTruncated: updatedIds.length > 50,
    applied: applyChanges,
  }, null, 2))
}

run()
  .catch((error) => {
    console.error('BACKFILL_MULTI_CHOICE_ANSWERS_FAILED', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
