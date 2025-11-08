'use client';

import { useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface HubGuideBannerProps {
  variant: 'paying' | 'locked';
  guideCount?: number;
  className?: string;
}

const guideCountLabel = (count: number) => {
  if (count > 0) {
    return `${count} guide${count === 1 ? '' : 's'} available`;
  }
  return 'New guides arriving soon';
};

export default function HubGuideBanner({ variant, guideCount = 0, className }: HubGuideBannerProps) {
  const [visible, setVisible] = useState(true);

  if (!visible) {
    return null;
  }

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
      {variant === 'paying' ? (
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-100">Hub Guides</p>
            <h2 className="mt-1 text-3xl font-bold">Always-on practice hub</h2>
            <p className="mt-2 max-w-xl text-indigo-100/80">
              Switch between your assigned lessons and on-demand guides anytime.
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-indigo-100">{guideCountLabel(guideCount)}</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-100">Hub Guides</p>
            <h2 className="mt-1 text-3xl font-bold">Always-on practice hub</h2>
            <p className="mt-2 max-w-xl text-indigo-100/80">
              Upgrade to unlock interactive guides between lessons.
            </p>
          </div>
          <Button asChild variant="secondary" className="bg-white text-indigo-700">
            <Link href="/profile">Unlock Hub Guides</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
