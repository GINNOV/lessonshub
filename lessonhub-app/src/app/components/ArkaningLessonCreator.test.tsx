import { render, screen } from '@testing-library/react'
import ArkaningLessonCreator from './ArkaningLessonCreator'

describe('ArkaningLessonCreator', () => {
  it('renders the lesson title field', () => {
    render(
      <ArkaningLessonCreator
        lesson={null}
        instructionBooklets={[]}
        teacherPreferences={{ defaultLessonPrice: 0 }}
      />
    )

    expect(screen.getByLabelText(/lesson title/i)).toBeInTheDocument()
  })
})
