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
    <section className="rounded-xl border bg-white shadow-sm">
      <header className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{helperText}</p>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-2 text-sm"
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
        className={cn('border-t px-4 pb-4 sm:px-6 sm:pb-6', open ? 'block' : 'hidden')}
      >
        {children}
      </div>
    </section>
  );
}
