// file: src/app/components/CollapsibleSection.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollapsibleSectionProps {
  title: string;
  helperText?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export default function CollapsibleSection({
  title,
  helperText,
  defaultOpen = true,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="rounded-2xl border border-slate-800/70 bg-slate-900/70 shadow-xl backdrop-blur-sm">
      <header className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-wide text-teal-200">{helperText}</p>
          <h2 className="text-lg font-semibold text-slate-50">{title}</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-2 text-sm text-slate-200 hover:text-white hover:bg-slate-800/80"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-controls={`${title.replace(/\s+/g, '-').toLowerCase()}-section`}
        >
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          {open ? 'Hide' : 'Show'}
        </Button>
      </header>
      <div
        id={`${title.replace(/\s+/g, '-').toLowerCase()}-section`}
        className={cn('border-t border-slate-800 px-4 pb-4 sm:px-6 sm:pb-6', open ? 'block' : 'hidden')}
      >
        {children}
      </div>
    </section>
  );
}
