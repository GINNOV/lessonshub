import { render, screen } from '@testing-library/react'
import LearningSessionPlayer from './LearningSessionPlayer'

describe('LearningSessionPlayer', () => {
  it('renders the lesson title', () => {
    render(
      <LearningSessionPlayer
        lessonTitle="Guide Lesson"
        cards={[
          { id: 'card-1', orderIndex: 0, content1: 'Intro', content2: null },
        ]}
      />
    )

    expect(screen.getByText(/guide lesson/i)).toBeInTheDocument()
  })
})
