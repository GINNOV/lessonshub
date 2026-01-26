import { render, screen } from '@testing-library/react'
import NewsArticleLessonCreator from './NewsArticleLessonCreator'

describe('NewsArticleLessonCreator', () => {
  it('renders the article editor fields', () => {
    render(<NewsArticleLessonCreator />)

    expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/lesson preview/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/article/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/max word taps/i)).toBeInTheDocument()
  })
})
