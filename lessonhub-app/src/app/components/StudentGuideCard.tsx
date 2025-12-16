'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Layers } from 'lucide-react';
import { marked } from 'marked';
import type { StudentGuideSummary } from '@/app/components/StudentGuideList';
import { LessonDifficultyIndicator } from '@/app/components/LessonDifficultySelector';

interface StudentGuideCardProps {
  guide: StudentGuideSummary;
}

const removeInstructionPrefix = (value: string | null) => {
  if (!value) return '';
  return value.replace(/👉🏼\s*INSTRUCTIONS:\s*/i, '').trim();
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

export default function StudentGuideCard({ guide }: StudentGuideCardProps) {
  const preview = removeInstructionPrefix(guide.lessonPreview) || 'Interactive flashcards you can revisit anytime.';
  const updated = new Date(guide.updatedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const imageSrc = guide.guideCardImage || '/my-guides/defaultcard.png';
  const previewHtml = useMemo(() => (preview ? (marked.parseInline(preview) as string) : ''), [preview]);
  const priceLabel = currencyFormatter.format(Math.max(guide.price, 0));

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
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
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">{guide.title}</h3>
          {previewHtml ? (
            <div
              className="prose prose-sm prose-invert max-w-none text-muted-foreground line-clamp-4 [&_*]:text-muted-foreground [&_*]:text-sm [&>p]:my-1"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          ) : (
            <p className="text-sm text-muted-foreground line-clamp-3">{preview}</p>
          )}
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-foreground">{priceLabel}</span>
          <span className="text-muted-foreground">Updated {updated}</span>
        </div>
        <LessonDifficultyIndicator value={guide.difficulty} size="sm" className="mt-2" />

        {guide.guideIsFreeForAll && (
          <span className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-100">
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
