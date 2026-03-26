import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import FlipperLessonPlayer from './FlipperLessonPlayer'

vi.mock('@/app/games/flipper/FlipperGame', () => ({
  default: () => <div>Flipper Game</div>,
}))

describe('FlipperLessonPlayer', () => {
  it('renders the game when tiles exist', () => {
    const tiles = Array.from({ length: 12 }, (_, index) => ({
      id: String(index + 1),
      imageUrl: `/tile-${index + 1}.png`,
      word: `Match ${index + 1}`,
    }))

    render(
      <FlipperLessonPlayer
        config={{ attemptsBeforePenalty: 3 }}
        tiles={tiles}
      />
    )

    expect(screen.getByText(/flipper game/i)).toBeInTheDocument()
  })
})
