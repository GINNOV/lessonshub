import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import FlipperLessonPlayer from './FlipperLessonPlayer'

vi.mock('@/app/games/flipper/FlipperGame', () => ({
  default: () => <div>Flipper Game</div>,
}))

describe('FlipperLessonPlayer', () => {
  it('renders the game when tiles exist', () => {
    render(
      <FlipperLessonPlayer
        config={{ attemptsBeforePenalty: 3 }}
        tiles={[{ id: '1', imageUrl: '/tile.png', word: 'Match' }]}
      />
    )

    expect(screen.getByText(/flipper game/i)).toBeInTheDocument()
  })
})
