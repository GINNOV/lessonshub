import { render, screen } from '@testing-library/react'
import LearningSessionCreator from './LearningSessionCreator'

describe('LearningSessionCreator', () => {
  it('renders the lesson title field', () => {
    render(
      <LearningSessionCreator
        lesson={null}
        instructionBooklets={[]}
      />
    )

    expect(screen.getByLabelText(/lesson title/i)).toBeInTheDocument()
  })
})
