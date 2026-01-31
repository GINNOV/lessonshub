import { render, screen } from '@testing-library/react'
import FlipperLessonCreator from './FlipperLessonCreator'

describe('FlipperLessonCreator', () => {
  it('renders the flipper editor fields', () => {
    render(<FlipperLessonCreator />)

    expect(screen.getByLabelText(/lesson title/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/lesson preview/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/attempts before penalty/i)).toBeInTheDocument()
    expect(screen.getByText(/flipper tiles/i)).toBeInTheDocument()
  })
})
