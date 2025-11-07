'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Layers } from 'lucide-react';
import type { StudentGuideSummary } from '@/app/components/StudentGuideList';

interface StudentGuideCardProps {
  guide: StudentGuideSummary;
}

const removeInstructionPrefix = (value: string | null) => {
  if (!value) return '';
  return value.replace(/👉🏼\s*INSTRUCTIONS:\s*/i, '').trim();
};

export default function StudentGuideCard({ guide }: StudentGuideCardProps) {
  const preview = removeInstructionPrefix(guide.lessonPreview) || 'Interactive flashcards you can revisit anytime.';
  const updated = new Date(guide.updatedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const imageSrc = guide.guideCardImage || '/my-guides/defaultcard.png';

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="relative h-36 w-full sm:h-40">
        <Image
          src={imageSrc}
          alt=""
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority={false}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute bottom-3 left-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white">
          <Layers className="h-4 w-4" />
          Hub Guide
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-gray-900">{guide.title}</h3>
          <p className="text-sm text-gray-500 max-h-16 overflow-hidden">{preview}</p>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{guide.cardCount} cards</span>
          <span>Difficulty {guide.difficulty}</span>
        </div>
        <div className="text-xs text-gray-400">Updated {updated}</div>

        {guide.guideIsFreeForAll && (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            Free access
          </span>
        )}

        <Button asChild className="mt-auto w-full">
          <Link href={`/guides/${guide.id}`} aria-label={`Open ${guide.title}`}>
            Open Guide
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
