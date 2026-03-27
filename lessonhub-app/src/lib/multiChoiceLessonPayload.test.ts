import { AssignmentNotification } from '@prisma/client'
import { describe, expect, it } from 'vitest'

import { parseMultiChoiceLessonPayload } from '@/lib/multiChoiceLessonPayload'

describe('parseMultiChoiceLessonPayload', () => {
  it('parses a valid payload and falls back to topic for title', () => {
    const parsed = parseMultiChoiceLessonPayload(
      {
        topic: 'Travel phrases',
        difficulty: 4,
        price: '12.5',
        assignment_notification: AssignmentNotification.ASSIGN_ON_DATE,
        scheduled_assignment_date: '2026-03-27T09:00:00.000Z',
        questions: [
          {
            question: 'Which phrase asks for directions?',
            options: [
              { text: 'Where is the station?', isCorrect: true },
              { text: 'I would like some water.', isCorrect: false },
            ],
          },
        ],
      },
      { requireTopic: true }
    )

    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return

    expect(parsed.data.title).toBe('Travel phrases')
    expect(parsed.data.topic).toBe('Travel phrases')
    expect(parsed.data.price).toBe(12.5)
    expect(parsed.data.assignmentNotification).toBe(AssignmentNotification.ASSIGN_ON_DATE)
  })

  it('rejects questions without exactly one correct answer', () => {
    const parsed = parseMultiChoiceLessonPayload({
      title: 'Bad quiz',
      questions: [
        {
          question: 'Pick one',
          options: [
            { text: 'A', isCorrect: true },
            { text: 'B', isCorrect: true },
          ],
        },
      ],
    })

    expect(parsed).toEqual({
      ok: false,
      error:
        'Questions must include at least one question, at least two options per question, and exactly one correct option.',
    })
  })

  it('requires topic for automation payloads', () => {
    const parsed = parseMultiChoiceLessonPayload(
      {
        title: 'Automation lesson',
        questions: [
          {
            question: 'Pick one',
            options: [
              { text: 'A', isCorrect: true },
              { text: 'B', isCorrect: false },
            ],
          },
        ],
      },
      { requireTopic: true }
    )

    expect(parsed).toEqual({
      ok: false,
      error: 'Topic is required for automation-created lessons.',
    })
  })
})
