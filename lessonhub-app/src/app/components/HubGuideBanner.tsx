'use client';

import { useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface HubGuideBannerProps {
  guideCount?: number;
  className?: string;
  copy?: {
    tabLabel: string;
    bannerKicker: string;
    bannerTitle: string;
    bannerBody: string;
    bannerCta: string;
    countSingle: string;
    countPlural: string;
    countZero: string;
  };
}

export default function HubGuideBanner({ guideCount = 0, className, copy }: HubGuideBannerProps) {
  const [visible, setVisible] = useState(true);

  if (!visible) {
    return null;
  }

  const guideCountLabel = (() => {
    if (guideCount === 0) return copy?.countZero || 'New guides arriving soon';
    if (guideCount === 1)
      return (copy?.countSingle || '{count} guide available').replace('{count}', guideCount.toString());
    return (copy?.countPlural || '{count} guides available').replace('{count}', guideCount.toString());
  })();

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-3xl border border-slate-800/70 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-6 text-slate-50 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur',
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute -left-10 top-0 h-48 w-48 rounded-full bg-teal-500/20 blur-3xl" />
        <div className="absolute right-0 top-6 h-56 w-56 rounded-full bg-emerald-400/15 blur-3xl" />
      </div>
      <button
        type="button"
        aria-label="Dismiss hub guides banner"
        onClick={() => setVisible(false)}
        className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-slate-900/70 text-slate-200 transition hover:border-teal-500/50 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2 md:max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-200">
            {copy?.bannerKicker || 'Hub Guides'}
          </p>
          <h2 className="text-3xl font-bold text-slate-50">{copy?.bannerTitle || 'Always-on practice hub'}</h2>
          <p className="text-slate-300">
            {copy?.bannerBody ||
              'Guides are always ready for practice. No deadlines, no expirations, no grading—just a pure knowledge stream into your brain vessels. Some guides are free and a ton of others are for a small token of cash. Upgrade to unlock interactive guides between lessons.'}
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 md:items-end">
          <Button
            asChild
            variant="secondary"
            className="shrink-0 border border-teal-300/60 bg-gradient-to-r from-teal-400 to-emerald-500 text-slate-950 shadow-[0_12px_35px_rgba(45,212,191,0.35)] transition hover:brightness-110"
          >
            <Link href="/profile?tab=status">{copy?.bannerCta || 'Unlock Hub Guides'}</Link>
          </Button>
          <div className="text-sm font-medium text-teal-100/80">{guideCountLabel}</div>
        </div>
      </div>
    </div>
  );
}
