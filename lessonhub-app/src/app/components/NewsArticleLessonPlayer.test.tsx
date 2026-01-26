import { render, screen } from '@testing-library/react'
import NewsArticleLessonPlayer from './NewsArticleLessonPlayer'

describe('NewsArticleLessonPlayer', () => {
  it('renders the newspaper layout', () => {
    render(
      <NewsArticleLessonPlayer
        assignmentId="assignment-1"
        markdown="Hello world"
        maxWordTaps={null}
        initialTapCount={0}
        lessonTitle="Daily Brief"
      />
    )

    expect(screen.getByText(/lessonhub times/i)).toBeInTheDocument()
    expect(screen.getByText(/daily brief/i)).toBeInTheDocument()
    expect(screen.getByText(/hello/i)).toBeInTheDocument()
  })
})
