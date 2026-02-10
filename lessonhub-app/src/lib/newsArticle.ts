const WORD_REGEX = /[A-Za-zÀ-ÖØ-öø-ÿ]+/g;
const WORD_CLEAN_REGEX = /[^a-z0-9à-öø-ÿ]/gi;

export const NEWS_ARTICLE_BASE_POINTS = 50;
export const NEWS_ARTICLE_BASE_EUROS = 0.5;
export const NEWS_ARTICLE_REPEAT_POINTS = 5;
export const NEWS_ARTICLE_REPEAT_EUROS = 0.005;

export const NEWS_ARTICLE_MIN_WORD_LENGTH = 5;

export function normalizeNewsArticleWord(word: string) {
  return word.trim().toLowerCase().replace(WORD_CLEAN_REGEX, '');
}

export function extractUniqueNewsArticleWords(markdown: string) {
  const matches = markdown.match(WORD_REGEX) ?? [];
  const unique = new Set<string>();
  matches.forEach((match) => {
    const normalized = normalizeNewsArticleWord(match);
    if (normalized.length >= NEWS_ARTICLE_MIN_WORD_LENGTH) {
      unique.add(normalized);
    }
  });
  return unique;
}

export function getNewsArticlePenaltyRate(tapRatio: number) {
  if (tapRatio > 0.8) return 2;
  if (tapRatio < 0.5) return 0.005;
  return 0.003;
}
