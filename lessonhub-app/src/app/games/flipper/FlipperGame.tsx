'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { POINT_TO_EURO_RATE } from '@/lib/points';
import { cn } from '@/lib/utils';

const PENALTY_PER_ATTEMPT = 5;
const ATTEMPT_REWARDS = [10, 5, 1];
const FLIP_BACK_DELAY_MS = 3000;

export type FlipperTile = {
  id: string;
  imageUrl: string;
  word: string;
};

type FlipperCard = {
  id: string;
  tileId: string;
  type: 'image' | 'word';
  imageUrl: string;
  word: string;
};

const createCardId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const shuffle = <T,>(items: T[]) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const getEurosDelta = (attempts: number, threshold: number) => {
  if (attempts <= 0 || !Number.isFinite(attempts)) return 0;
  if (attempts === 1) return ATTEMPT_REWARDS[0];
  if (attempts === 2) return ATTEMPT_REWARDS[1];
  if (attempts <= threshold) return ATTEMPT_REWARDS[2];
  return -PENALTY_PER_ATTEMPT * (attempts - threshold);
};

export default function FlipperGame({
  tiles,
  attemptsBeforePenalty,
  assignmentId,
}: {
  tiles: FlipperTile[];
  attemptsBeforePenalty: number;
  assignmentId?: string;
}) {
  const [deckKey, setDeckKey] = useState(0);
  const [flippedIds, setFlippedIds] = useState<string[]>([]);
  const [matchedTileIds, setMatchedTileIds] = useState<Set<string>>(new Set());
  const [isResolving, setIsResolving] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const attemptsRef = useRef(0);
  const [points, setPoints] = useState(0);
  const [euros, setEuros] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const completionSentRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);

  const threshold = Math.max(3, attemptsBeforePenalty || 3);

  const deck = useMemo(() => {
    const deckKeySuffix = deckKey;
    const cards = tiles.flatMap((tile) => {
      const safeWord = tile.word.trim();
      return [
        {
          id: `${createCardId()}-${deckKeySuffix}`,
          tileId: tile.id,
          type: 'image' as const,
          imageUrl: tile.imageUrl,
          word: safeWord,
        },
        {
          id: `${createCardId()}-${deckKeySuffix}`,
          tileId: tile.id,
          type: 'word' as const,
          imageUrl: tile.imageUrl,
          word: safeWord,
        },
      ];
    });
    return shuffle(cards);
  }, [tiles, deckKey]);

  const cardById = useMemo(() => {
    return new Map(deck.map((card) => [card.id, card]));
  }, [deck]);

  useEffect(() => {
    attemptsRef.current = attempts;
  }, [attempts]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const applyLocalScore = (attemptsCount: number, word: string) => {
    const eurosDelta = getEurosDelta(attemptsCount, threshold);
    const pointsDelta = Math.round(eurosDelta / POINT_TO_EURO_RATE);
    setEuros((prev) => prev + eurosDelta);
    setPoints((prev) => prev + pointsDelta);
    setMessage(
      eurosDelta >= 0
        ? `Match found! +€${eurosDelta}`
        : `Match found — ${word} cost €${Math.abs(eurosDelta)}`,
    );
    return { eurosDelta, pointsDelta };
  };

  const recordMatch = async (attemptsCount: number, word: string) => {
    if (!assignmentId) {
      return applyLocalScore(attemptsCount, word);
    }

    try {
      const response = await fetch(`/api/assignments/${assignmentId}/flipper`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attempts: attemptsCount, word }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Unable to record match.');
      }
      const payload = await response.json();
      const eurosDelta = Number(payload?.eurosDelta ?? 0);
      const pointsDelta = Number(payload?.pointsDelta ?? 0);
      setEuros((prev) => prev + eurosDelta);
      setPoints((prev) => prev + pointsDelta);
      setMessage(
        eurosDelta >= 0
          ? `Match found! +€${eurosDelta}`
          : `Match found — penalty €${Math.abs(eurosDelta)}`,
      );
      return { eurosDelta, pointsDelta };
    } catch (error) {
      setMessage((error as Error).message);
      return null;
    }
  };

  const sendCompletion = useCallback(async () => {
    if (!assignmentId || completionSentRef.current) return;
    completionSentRef.current = true;
    await fetch(`/api/assignments/${assignmentId}/flipper/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }).catch(() => {});
  }, [assignmentId]);

  const handleFlip = (card: FlipperCard) => {
    if (isResolving) return;
    if (matchedTileIds.has(card.tileId)) return;
    if (flippedIds.includes(card.id)) return;

    const nextFlipped = [...flippedIds, card.id];
    setFlippedIds(nextFlipped);

    if (nextFlipped.length === 2) {
      const [first, second] = nextFlipped.map((id) => cardById.get(id)).filter(Boolean) as FlipperCard[];
      const nextAttempts = attemptsRef.current + 1;
      setAttempts(nextAttempts);
      attemptsRef.current = nextAttempts;

      if (first.tileId === second.tileId) {
        setIsResolving(true);
        recordMatch(nextAttempts, first.word);
        setMatchedTileIds((prev) => new Set([...prev, first.tileId]));
        setAttempts(0);
        attemptsRef.current = 0;
        timeoutRef.current = window.setTimeout(() => {
          setFlippedIds([]);
          setIsResolving(false);
        }, 500);
      } else {
        setIsResolving(true);
        timeoutRef.current = window.setTimeout(() => {
          setFlippedIds([]);
          setIsResolving(false);
        }, FLIP_BACK_DELAY_MS);
      }
    }
  };

  useEffect(() => {
    if (matchedTileIds.size && matchedTileIds.size === tiles.length) {
      setCompleted(true);
      sendCompletion();
    }
  }, [matchedTileIds, tiles.length, sendCompletion]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-5 text-slate-100 shadow-[0_20px_50px_rgba(15,23,42,0.6)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-teal-300/80">Flipper Run</p>
            <h2 className="text-2xl font-semibold">Match the image to the word</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="rounded-full border border-emerald-300/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-100">
              € {euros}
            </div>
            <div className="rounded-full border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm font-semibold text-slate-200">
              {points} pts
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-300">
          <span className="rounded-full border border-slate-800 bg-slate-900/50 px-3 py-1">
            Attempts since last match: {attempts}
          </span>
          <span className="rounded-full border border-slate-800 bg-slate-900/50 px-3 py-1">
            Matches: {matchedTileIds.size}/{tiles.length}
          </span>
          <span className="rounded-full border border-slate-800 bg-slate-900/50 px-3 py-1">
            Penalty after {threshold} attempts
          </span>
        </div>
        {message && (
          <div className="mt-4 rounded-xl border border-slate-800/60 bg-slate-900/70 px-4 py-3 text-sm text-slate-100">
            {message}
          </div>
        )}
        {completed && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/20 px-4 py-3 text-sm font-semibold text-emerald-100">
            <Sparkles className="h-4 w-4" />
            All matches found. Nice work!
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {deck.map((card) => {
          const isMatched = matchedTileIds.has(card.tileId);
          const isFlipped = isMatched || flippedIds.includes(card.id);

          return (
            <button
              key={card.id}
              type="button"
              onClick={() => handleFlip(card)}
              className={cn(
                'group relative h-32 w-full rounded-2xl border border-slate-800 bg-slate-900/70 p-0 text-left shadow-[0_12px_30px_rgba(15,23,42,0.45)] transition-transform duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60',
                isMatched ? 'border-emerald-400/60' : 'hover:-translate-y-1',
              )}
              disabled={isMatched || isResolving}
              style={{ perspective: '900px' }}
            >
              <span
                className="absolute inset-0 rounded-2xl transition-transform duration-500"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                }}
              >
                <span
                  className="absolute inset-0 flex items-center justify-center rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 text-xs uppercase tracking-[0.4em] text-slate-400"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  Flip
                </span>
                <span
                  className="absolute inset-0 flex items-center justify-center rounded-2xl bg-slate-950"
                  style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}
                >
                  {card.type === 'image' ? (
                    <div className="relative h-full w-full overflow-hidden rounded-2xl">
                      <Image
                        src={card.imageUrl}
                        alt={card.word}
                        fill
                        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 100vw"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <span className="px-3 text-center text-xl font-bold uppercase tracking-wide text-slate-100">
                      {card.word}
                    </span>
                  )}
                </span>
              </span>
              {isMatched && (
                <span className="absolute -right-2 -top-2 rounded-full bg-emerald-500 p-1 text-white shadow-lg">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {!assignmentId && (
        <div className="flex flex-wrap items-center gap-3">
          <ButtonGhost onClick={() => {
            setDeckKey((prev) => prev + 1);
            setFlippedIds([]);
            setMatchedTileIds(new Set());
            setAttempts(0);
            attemptsRef.current = 0;
            setMessage(null);
            setCompleted(false);
            completionSentRef.current = false;
          }}>
            Shuffle
          </ButtonGhost>
        </div>
      )}
    </div>
  );
}

function ButtonGhost({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-900/60 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-teal-400/60 hover:text-teal-100"
    >
      {children}
    </button>
  );
}
