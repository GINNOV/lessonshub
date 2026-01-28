// file: src/app/components/WeekDivider.tsx

export default function WeekDivider({
  weekNumber,
  year,
  label,
  className,
  dividerClassName,
  labelClassName,
}: {
  weekNumber: number;
  year?: number;
  label?: string;
  className?: string;
  dividerClassName?: string;
  labelClassName?: string;
}) {
  return (
    <div className={`flex items-center gap-3 ${className ?? ''}`}>
      <div className={`h-px flex-1 ${dividerClassName ?? 'bg-slate-800'}`} />
      <div
        className={`flex items-center gap-2 rounded-full border border-slate-800 bg-sky-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-300 shadow-sm ${
          labelClassName ?? ''
        }`}
      >
        <span role="img" aria-label="Calendar">🗓️</span>
        <span>
          {label ?? 'Week'} {weekNumber}
          {year ? ` • ${year}` : ''}
        </span>
      </div>
      <div className={`h-px flex-1 ${dividerClassName ?? 'bg-slate-800'}`} />
    </div>
  );
}
