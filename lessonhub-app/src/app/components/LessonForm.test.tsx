import { render, screen } from '@testing-library/react'
import LessonForm from './LessonForm'

describe('LessonForm', () => {
  it('renders the lesson title field', () => {
    render(
      <LessonForm
        teacherPreferences={{ defaultLessonPrice: 0 }}
        instructionBooklets={[]}
      />
    )

    expect(screen.getByLabelText(/lesson title/i)).toBeInTheDocument()
  })
})
