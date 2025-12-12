// file: src/app/components/StudentStatsHeader.tsx
'use client';

import React from 'react';
import {
  ClipboardList,
  Clock,
  CircleCheckBig,
  FileBadge,
  TrendingUp,
  Info,
  XCircle
} from 'lucide-react';
import InvestDialog from './InvestDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface StudentStatsHeaderProps {
  totalValue: number;
  totalPoints: number;
  total: number;
  pending: number;
  submitted: number;
  graded: number;
  failed: number;
  pastDue: number;
  settings: {
    progressCardTitle?: string | null;
    progressCardBody?: string | null;
    progressCardLinkText?: string | null;
    progressCardLinkUrl?: string | null;
    assignmentSummaryFooter?: string | null;
  } | null;
  copy?: {
    progressTitle: string;
    progressPoints: string;
    progressBody: string;
    investLink: string;
    aboutTitle: string;
    aboutBody: string;
    assignmentSummary: string;
    labels: {
      total: string;
      pending: string;
      submitted: string;
      graded: string;
      pastDue: string;
      failed: string;
    };
  };
}

// A sleek, reusable component for each individual stat in the summary
const StatItem = ({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: React.ElementType;
  value: number;
  label: string;
  tone: 'slate' | 'amber' | 'indigo' | 'emerald' | 'orange' | 'red';
}) => (
  <div className="rounded-xl border border-border bg-muted/50 p-4 text-center shadow-sm">
    <div
      className={`mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-lg ${
        {
          slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:text-slate-200',
          amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200 ring-1 ring-amber-500/40',
          indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200 ring-1 ring-indigo-500/30',
          emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-100 ring-1 ring-emerald-400/40',
          orange: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-200 ring-1 ring-orange-500/40',
          red: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200 ring-1 ring-rose-500/40',
        }[tone]
      }`}
    >
      <Icon className="h-5 w-5" />
    </div>
    <p className="text-2xl font-bold text-foreground">{value}</p>
    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
  </div>
);

export default function StudentStatsHeader({
  totalValue,
  totalPoints,
  total,
  pending,
  submitted,
  graded,
  failed,
  pastDue,
  settings,
  copy,
}: StudentStatsHeaderProps) {
  const labels = copy?.labels;
  const progressPointsLabel = (copy?.progressPoints || "{points} pts earned").replace(
    "{points}",
    totalPoints.toLocaleString(),
  );

  return (
    <div className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="relative overflow-hidden rounded-2xl border border-teal-400/30 bg-gradient-to-br from-teal-400 via-teal-500 to-emerald-500 p-6 text-white shadow-2xl lg:col-span-1">
        <div className="pointer-events-none absolute inset-0 opacity-30">
          <div className="absolute -left-16 top-6 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute right-10 top-16 h-32 w-32 rounded-full bg-emerald-200/20 blur-2xl" />
        </div>
        <div className="relative flex h-full flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm uppercase tracking-[0.08em] text-teal-50/90">
                {settings?.progressCardTitle || copy?.progressTitle || 'My Progress'}
              </h3>
              <p className="mt-2 text-5xl font-black leading-tight drop-shadow-sm">
                €{totalValue.toFixed(2)}
              </p>
              <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold text-white shadow-[0_8px_30px_rgba(0,0,0,0.2)]">
                <span role="img" aria-label="Sparkles">✨</span>
                {progressPointsLabel}
              </p>
            </div>
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white">
              <TrendingUp className="h-6 w-6" />
            </span>
          </div>
          <p className="relative text-sm leading-relaxed text-teal-50/90">
            {settings?.progressCardBody || copy?.progressBody || 'Total value from all graded lessons.'}
          </p>
          <div className="relative mt-auto flex flex-wrap items-center gap-2 text-sm font-semibold text-white/90">
            <span>💰</span>
            <InvestDialog
              linkText={settings?.progressCardLinkText || copy?.investLink || 'Invest in your future - watch now'}
              videoUrl={settings?.progressCardLinkUrl || "https://www.youtube.com/embed/kd8zMU3kd0s?si=j0X6hdJqhcXDYn3g&amp;controls=0"}
            />
          </div>
          <div className="absolute bottom-4 right-4">
            <Dialog>
              <DialogTrigger asChild>
                <button className="rounded-full bg-white/10 p-2 text-white/80 transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/80">
                  <Info className="h-5 w-5" />
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>{copy?.aboutTitle || 'About "My Progress"'}</DialogTitle>
                </DialogHeader>
                <div className="p-4">
                  <p>{copy?.aboutBody || 'Quanto avresti speso con un metodo di insegnamento tradizionale. Che affare!'}</p>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-xl lg:col-span-2">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-card-foreground">
            {copy?.assignmentSummary || 'Assignment Summary'}
          </h3>
          <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Dashboard
          </span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <StatItem
            icon={ClipboardList}
            value={total}
            label={labels?.total || "Total"}
            tone="slate"
          />
          <StatItem
            icon={Clock}
            value={pending}
            label={labels?.pending || "Pending"}
            tone="amber"
          />
          <StatItem
            icon={CircleCheckBig}
            value={submitted}
            label={labels?.submitted || "Submitted"}
            tone="indigo"
          />
          <StatItem
            icon={FileBadge}
            value={graded}
            label={labels?.graded || "Graded"}
            tone="emerald"
          />
          <StatItem
            icon={Clock}
            value={pastDue}
            label={labels?.pastDue || "Past Due"}
            tone="orange"
          />
          <StatItem
            icon={XCircle}
            value={failed}
            label={labels?.failed || "Failed"}
            tone="red"
          />
        </div>
        {settings?.assignmentSummaryFooter && (
          <div className="mt-4 border-t border-border pt-4 text-sm text-muted-foreground">
            {settings.assignmentSummaryFooter}
          </div>
        )}
      </div>
    </div>
  );
}
