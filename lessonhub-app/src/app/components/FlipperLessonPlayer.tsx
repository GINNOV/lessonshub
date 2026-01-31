'use client';

import { useMemo } from 'react';
import FlipperGame, { FlipperTile } from '@/app/games/flipper/FlipperGame';

export type FlipperLessonConfig = {
  attemptsBeforePenalty?: number | null;
} | null;

export default function FlipperLessonPlayer({
  config,
  tiles,
  assignmentId,
}: {
  config: FlipperLessonConfig;
  tiles: Array<FlipperTile> | null | undefined;
  assignmentId?: string;
}) {
  const normalizedTiles = useMemo(() => {
    if (!Array.isArray(tiles)) return [] as FlipperTile[];
    return tiles
      .map((tile) => ({
        id: String(tile.id),
        imageUrl: String((tile as any).imageUrl ?? '').trim(),
        word: String((tile as any).word ?? '').trim(),
      }))
      .filter((tile) => tile.id && tile.imageUrl && tile.word);
  }, [tiles]);

  const attemptsBeforePenalty = Math.max(3, Number(config?.attemptsBeforePenalty ?? 3));

  if (normalizedTiles.length < 12) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-6 text-center text-sm text-slate-300">
        This Flipper lesson is missing its tiles. Please contact support.
      </div>
    );
  }

  return (
    <FlipperGame
      tiles={normalizedTiles}
      attemptsBeforePenalty={attemptsBeforePenalty}
      assignmentId={assignmentId}
    />
  );
}
