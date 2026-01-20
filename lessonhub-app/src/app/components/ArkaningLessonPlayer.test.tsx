import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import ArkaningLessonPlayer from './ArkaningLessonPlayer'

vi.mock('@/app/games/arkaning/ArkaningGame', () => ({
  default: () => <div>Arkaning Game</div>,
}))

describe('ArkaningLessonPlayer', () => {
  it('renders the game when questions exist', () => {
    render(
      <ArkaningLessonPlayer
        config={{
          questionBank: [{ prompt: 'Test', answer: 'ing', reveal: 'testing' }],
        }}
      />
    )

    expect(screen.getByText(/arkaning game/i)).toBeInTheDocument()
  })
})
