import { describe, expect, it } from 'vitest'
import {
  parseMultiChoiceAnswers,
  resolveSelectedLabel,
  resolveSelectedOption,
  type MultiChoiceQuestion,
} from './multiChoiceAnswers'

const questions: MultiChoiceQuestion[] = [
  {
    id: 'q1',
    options: [
      { id: 'o1', text: 'Alpha' },
      { id: 'o2', text: 'Bravo' },
      { id: 'o3', text: 'Charlie' },
    ],
  },
  {
    id: 'q2',
    options: [
      { id: 'o4', text: 'Delta' },
      { id: 'o5', text: 'Echo' },
      { id: 'o6', text: 'Foxtrot' },
    ],
  },
]

describe('multiChoiceAnswers', () => {
  it('maps mismatched question ids to the current question index', () => {
    const raw = [
      { questionId: 'old-q1', selectedAnswerText: 'Bravo', selectedAnswerIndex: 1 },
      { questionId: 'old-q2', selectedAnswerText: 'Foxtrot', selectedAnswerIndex: 2 },
    ]
    const parsed = parseMultiChoiceAnswers(raw, questions)
    expect(parsed.q1?.questionId).toBe('q1')
    expect(parsed.q2?.questionId).toBe('q2')
  })

  it('resolves the selected option by text when ids do not match', () => {
    const raw = [
      { questionId: 'old-q1', selectedAnswerText: 'Charlie' },
    ]
    const parsed = parseMultiChoiceAnswers(raw, questions)
    const answer = parsed.q1
    const selected = resolveSelectedOption(questions[0], answer)
    expect(selected?.id).toBe('o3')
  })

  it('returns a selected label fallback when only ids are present', () => {
    const raw = [
      { questionId: 'q2', selectedAnswerId: 'o5' },
    ]
    const parsed = parseMultiChoiceAnswers(raw, questions)
    const answer = parsed.q2
    const selected = resolveSelectedOption(questions[1], answer)
    const label = resolveSelectedLabel(questions[1], answer, selected)
    expect(label).toBe('Echo')
  })
})
