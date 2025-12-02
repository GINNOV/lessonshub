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
        'relative rounded-3xl bg-gradient-to-r from-indigo-600 to-blue-500 p-6 text-white shadow-lg',
        className
      )}
    >
      <button
        type="button"
        aria-label="Dismiss hub guides banner"
        onClick={() => setVisible(false)}
        className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white transition hover:bg-white/20"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2 md:max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-100">
            {copy?.bannerKicker || 'Hub Guides'}
          </p>
          <h2 className="text-3xl font-bold">{copy?.bannerTitle || 'Always-on practice hub'}</h2>
          <p className="text-indigo-100/80">
            {copy?.bannerBody ||
              'Guides are always ready for practice. No deadlines, no expirations, no grading—just a pure knowledge stream into your brain vessels. Some guides are free and a ton of others are for a small token of cash. Upgrade to unlock interactive guides between lessons.'}
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 md:items-end">
          <Button asChild variant="secondary" className="bg-white text-indigo-700 shrink-0">
            <Link href="/profile?tab=status">{copy?.bannerCta || 'Unlock Hub Guides'}</Link>
          </Button>
          <div className="text-sm text-indigo-100/80">{guideCountLabel}</div>
        </div>
      </div>
    </div>
  );
}
