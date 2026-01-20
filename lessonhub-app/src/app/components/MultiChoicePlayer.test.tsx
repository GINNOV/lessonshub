import { render, screen } from '@testing-library/react'
import MultiChoicePlayer from './MultiChoicePlayer'

describe('MultiChoicePlayer', () => {
  it('renders the submit action', () => {
    const assignment = {
      id: 'assignment-1',
      studentId: 'student-1',
      status: 'PENDING',
      lesson: {
        title: 'Multi Choice',
        price: 0,
        multiChoiceQuestions: [
          {
            id: 'q1',
            question: 'Pick one',
            options: [
              { id: 'o1', text: 'A', isCorrect: true },
              { id: 'o2', text: 'B', isCorrect: false },
            ],
          },
        ],
      },
      draftAnswers: null,
    } as any

    render(<MultiChoicePlayer assignment={assignment} />)

    expect(screen.getByRole('button', { name: /submit answers/i })).toBeInTheDocument()
  })
})
