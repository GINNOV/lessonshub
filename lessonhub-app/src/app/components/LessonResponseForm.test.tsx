import { render, screen } from '@testing-library/react'
import LessonResponseForm from './LessonResponseForm'

describe('LessonResponseForm', () => {
  it('renders the answer input', () => {
    const assignment = {
      id: 'assignment-1',
      studentId: 'student-1',
      lessonId: 'lesson-1',
      status: 'PENDING',
      lesson: {
        title: 'Test Lesson',
        questions: ['What is your name?'],
        price: 0,
      },
      answers: [''],
    } as any

    render(<LessonResponseForm assignment={assignment} />)

    expect(screen.getByPlaceholderText(/your answer/i)).toBeInTheDocument()
  })
})
