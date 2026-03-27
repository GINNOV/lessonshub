import { AssignmentNotification } from '@prisma/client'
import { describe, expect, it } from 'vitest'

import { parseStandardLessonPayload } from '@/lib/standardLessonPayload'

describe('parseStandardLessonPayload', () => {
  it('parses a valid standard lesson payload', () => {
    const parsed = parseStandardLessonPayload(
      {
        topic: 'Restaurant English',
        assignmentText: 'Answer the prompts in full sentences.',
        questions: [
          {
            question: 'What would you say to ask for the menu?',
            expectedAnswer: 'Could I see the menu, please?',
          },
        ],
        difficulty: 2,
        price: '5',
        assignment_notification: AssignmentNotification.NOT_ASSIGNED,
      },
      { requireTopic: true }
    )

    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return

    expect(parsed.data.title).toBe('Restaurant English')
    expect(parsed.data.contextText).toBe('Restaurant English')
    expect(parsed.data.questions[0]?.expectedAnswer).toBe('Could I see the menu, please?')
  })

  it('rejects payloads without assignment text', () => {
    const parsed = parseStandardLessonPayload({
      title: 'Missing body',
      questions: [{ question: 'Hello?' }],
    })

    expect(parsed).toEqual({
      ok: false,
      error: 'Assignment text is required.',
    })
  })

  it('requires at least one question prompt', () => {
    const parsed = parseStandardLessonPayload({
      title: 'No questions',
      assignmentText: 'Do the work.',
      questions: [],
    })

    expect(parsed).toEqual({
      ok: false,
      error: 'Questions must include at least one prompt.',
    })
  })
})
