// file: src/lib/composer.ts
export type ComposerQuestion = {
  id: string;
  prompt: string;
  answer: string;
  maxTries?: number | null;
};

export type ComposerToken = {
  type: 'word' | 'separator';
  value: string;
  index?: number;
};

const WORD_REGEX = /[A-Za-z']+/g;

export const normalizeComposerWord = (word: string) => word.trim().toLowerCase();

export function parseComposerSentence(sentence: string) {
  const tokens: ComposerToken[] = [];
  const words: string[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = WORD_REGEX.exec(sentence)) !== null) {
    const [value] = match;
    const start = match.index;
    const end = start + value.length;
    if (start > lastIndex) {
      tokens.push({
        type: 'separator',
        value: sentence.slice(lastIndex, start),
      });
    }
    const index = words.length;
    words.push(value);
    tokens.push({ type: 'word', value, index });
    lastIndex = end;
  }

  if (lastIndex < sentence.length) {
    tokens.push({
      type: 'separator',
      value: sentence.slice(lastIndex),
    });
  }

  const uniqueWords: string[] = [];
  const seen = new Set<string>();
  words.forEach((word) => {
    const normalized = normalizeComposerWord(word);
    if (seen.has(normalized)) return;
    seen.add(normalized);
    uniqueWords.push(word);
  });

  return { tokens, words, uniqueWords };
}

export function groupComposerQuestions(questionBank: ComposerQuestion[]) {
  const map = new Map<string, ComposerQuestion[]>();
  questionBank.forEach((question) => {
    const key = normalizeComposerWord(question.answer);
    if (!map.has(key)) map.set(key, []);
    map.get(key)?.push(question);
  });
  return map;
}

export function hashComposerSeed(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getComposerExtraTries(answers: unknown, maxTries = 1) {
  if (!Array.isArray(answers)) return 0;
  return answers.reduce((sum, answer) => {
    const tries = Number((answer as { tries?: number })?.tries ?? 0);
    const perQuestionMax = Number((answer as { maxTries?: number | null })?.maxTries ?? maxTries);
    const effectiveMax =
      Number.isInteger(perQuestionMax) && perQuestionMax > 0 ? perQuestionMax : maxTries;
    if (!Number.isFinite(tries) || tries <= effectiveMax) return sum;
    return sum + (tries - effectiveMax);
  }, 0);
}
