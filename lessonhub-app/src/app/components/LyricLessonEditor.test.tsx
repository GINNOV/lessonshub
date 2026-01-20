import { render, screen } from '@testing-library/react'
import LyricLessonEditor from './LyricLessonEditor'

describe('LyricLessonEditor', () => {
  it('renders the lesson title field', () => {
    render(
      <LyricLessonEditor
        teacherPreferences={{ defaultLessonPrice: 0 }}
        instructionBooklets={[]}
      />
    )

    expect(screen.getByLabelText(/lesson title/i)).toBeInTheDocument()
  })
})
