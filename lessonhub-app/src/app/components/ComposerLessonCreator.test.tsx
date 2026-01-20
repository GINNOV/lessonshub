import { render, screen } from '@testing-library/react'
import ComposerLessonCreator from './ComposerLessonCreator'

describe('ComposerLessonCreator', () => {
  it('renders the lesson title field', () => {
    render(
      <ComposerLessonCreator
        lesson={null}
        instructionBooklets={[]}
        teacherPreferences={{ defaultLessonPrice: 0 }}
      />
    )

    expect(screen.getByLabelText(/lesson title/i)).toBeInTheDocument()
  })
})
