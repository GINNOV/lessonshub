import { render, screen } from '@testing-library/react'
import FlashcardPlayer from './FlashcardPlayer'

describe('FlashcardPlayer', () => {
  it('renders the start prompt', () => {
    const assignment = {
      id: 'assignment-1',
      studentId: 'student-1',
      status: 'PENDING',
      lesson: {
        title: 'Flashcards',
        price: 0,
        soundcloud_url: null,
        flashcards: [
          { id: 'fc-1', term: 'Hello', definition: 'Ciao' },
        ],
      },
      answers: {},
    } as any

    render(<FlashcardPlayer assignment={assignment} />)

    expect(screen.getByText(/start/i)).toBeInTheDocument()
  })
})
