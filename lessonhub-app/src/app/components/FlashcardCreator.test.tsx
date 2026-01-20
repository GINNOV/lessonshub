import { render, screen } from '@testing-library/react'
import FlashcardCreator from './FlashcardCreator'

describe('FlashcardCreator', () => {
  it('renders the lesson title field', () => {
    render(
      <FlashcardCreator
        teacherPreferences={{ defaultLessonPrice: 0 }}
        instructionBooklets={[]}
      />
    )

    expect(screen.getByLabelText(/lesson title/i)).toBeInTheDocument()
  })
})
