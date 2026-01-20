import { render, screen } from '@testing-library/react'
import MultiChoiceCreator from './MultiChoiceCreator'

describe('MultiChoiceCreator', () => {
  it('renders the lesson title field', () => {
    render(
      <MultiChoiceCreator
        teacherPreferences={{ defaultLessonPrice: 0 }}
        instructionBooklets={[]}
      />
    )

    expect(screen.getByLabelText(/lesson title/i)).toBeInTheDocument()
  })
})
