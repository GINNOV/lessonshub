import { render, screen } from '@testing-library/react'
import LyricLessonPlayer from './LyricLessonPlayer'

describe('LyricLessonPlayer', () => {
  it('renders playback controls', () => {
    render(
      <LyricLessonPlayer
        assignmentId="assignment-1"
        studentId="student-1"
        lessonId="lesson-1"
        audioUrl={null}
        lines={[
          {
            id: 'line-1',
            text: 'Hello world',
            startTime: 0,
            endTime: 2,
            hiddenWords: ['world'],
          },
        ]}
        settings={null}
        status="PENDING"
        existingAttempt={null}
      />
    )

    expect(screen.getByRole('button', { name: /read along/i })).toBeInTheDocument()
  })
})
