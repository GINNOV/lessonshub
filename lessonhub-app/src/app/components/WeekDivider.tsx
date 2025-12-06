// file: src/app/components/WeekDivider.tsx

export default function WeekDivider({ weekNumber }: { weekNumber: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-slate-800" />
      <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-300 shadow-sm">
        <span role="img" aria-label="Calendar">🗓️</span>
        <span>Week {weekNumber}</span>
      </div>
      <div className="h-px flex-1 bg-slate-800" />
    </div>
  );
}
