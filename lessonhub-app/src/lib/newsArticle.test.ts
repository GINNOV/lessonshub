import { describe, expect, it } from 'vitest'

import {
  NEWS_ARTICLE_INTERACTIVE_WORD_REGEX,
  extractUniqueNewsArticleWords,
  formatNewsArticleTapNote,
  normalizeNewsArticleWord,
  parseNewsArticleTapNote,
} from './newsArticle'

describe('newsArticle helpers', () => {
  it('normalizes and formats tap notes consistently', () => {
    expect(normalizeNewsArticleWord("  L'été! ")).toBe('lété')
    expect(formatNewsArticleTapNote("  L'été! ")).toBe('News Article tap: lété')
  })

  it('parses only valid tap notes', () => {
    expect(parseNewsArticleTapNote('News Article tap: Résumé')).toBe('résumé')
    expect(parseNewsArticleTapNote('News Article penalty: 1/10 unique words (10%)')).toBeNull()
    expect(parseNewsArticleTapNote('News Article tap: ')).toBeNull()
    expect(parseNewsArticleTapNote(null)).toBeNull()
  })

  it('keeps interactive tokenization aligned with accented article words', () => {
    expect('El niño said “résumé”.'.match(NEWS_ARTICLE_INTERACTIVE_WORD_REGEX)).toEqual([
      'El',
      'niño',
      'said',
      'résumé',
    ])
  })

  it('extracts unique penalty words using normalized values', () => {
    const words = extractUniqueNewsArticleWords('Resume résumé alpha gamma gamma')

    expect(Array.from(words).sort()).toEqual(['alpha', 'gamma', 'resume', 'résumé'])
  })
})
