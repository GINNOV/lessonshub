'use client';

import { useMemo } from 'react';
import ArkaningGame from '@/app/games/arkaning/ArkaningGame';

type AnswerChoice = 'ing' | 'not-ing';

type ArkaningQuestion = {
  prompt: string;
  answer: AnswerChoice;
  reveal: string;
};

type ArkaningLessonConfig = {
  questionBank?: unknown;
  roundsPerCorrect?: number | null;
  pointsPerCorrect?: number | null;
  eurosPerCorrect?: number | null;
  lives?: number | null;
  loseLifeOnWrong?: boolean | null;
  wrongsPerLife?: number | null;
};

const normalizeAnswer = (value: unknown): AnswerChoice | null => {
  const raw = String(value ?? '').trim().toLowerCase();
  if (raw === 'ing' || raw === '-ing') return 'ing';
  if (raw === 'not-ing' || raw === 'not ing' || raw === 'not-ing.') return 'not-ing';
  return null;
};

const normalizeQuestions = (questionBank: unknown): ArkaningQuestion[] => {
  if (!Array.isArray(questionBank)) return [];
  return questionBank
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const prompt = typeof (item as any).prompt === 'string' ? (item as any).prompt.trim() : '';
      const reveal = typeof (item as any).reveal === 'string' ? (item as any).reveal.trim() : '';
      const answer = normalizeAnswer((item as any).answer);
      if (!prompt || !reveal || !answer) return null;
      return { prompt, reveal, answer };
    })
    .filter((item): item is ArkaningQuestion => Boolean(item));
};

export default function ArkaningLessonPlayer({
  config,
  assignmentId,
}: {
  config: ArkaningLessonConfig | null;
  assignmentId?: string;
}) {
  const questions = useMemo(
    () => normalizeQuestions(config?.questionBank),
    [config?.questionBank],
  );
  const settings = useMemo(
    () => ({
      roundsPerCorrect: Number(config?.roundsPerCorrect ?? 3),
      pointsPerCorrect: Number(config?.pointsPerCorrect ?? 10),
      eurosPerCorrect: Number(config?.eurosPerCorrect ?? 5),
      lives: Number(config?.lives ?? 5),
      loseLifeOnWrong: Boolean(config?.loseLifeOnWrong ?? true),
      wrongsPerLife: Number(config?.wrongsPerLife ?? 1),
    }),
    [
      config?.roundsPerCorrect,
      config?.pointsPerCorrect,
      config?.eurosPerCorrect,
      config?.lives,
      config?.loseLifeOnWrong,
      config?.wrongsPerLife,
    ],
  );

  if (!questions.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-6 text-center text-sm text-slate-300">
        This ArkanING lesson is missing its question bank. Please contact support.
      </div>
    );
  }

  return (
    <ArkaningGame
      questions={questions}
      settings={settings}
      embedded={true}
      assignmentId={assignmentId}
    />
  );
}
