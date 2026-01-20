import { render, screen } from '@testing-library/react'
import ComposerLessonPlayer from './ComposerLessonPlayer'

describe('ComposerLessonPlayer', () => {
  it('renders the terminal header', () => {
    const assignment = {
      id: 'assignment-1',
      studentId: 'student-1',
      status: 'PENDING',
      lesson: {
        title: 'Composer',
        price: 0,
        composerConfig: {
          hiddenSentence: 'Test sentence',
          questionBank: [
            { id: 'q1', prompt: 'Choose', answer: 'alpha', maxTries: 1 },
          ],
          maxTries: 1,
        },
      },
      draftAnswers: null,
    } as any

    render(<ComposerLessonPlayer assignment={assignment} />)

    expect(screen.getByText(/terminal/i)).toBeInTheDocument()
  })
})
