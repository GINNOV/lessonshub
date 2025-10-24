// file: src/app/components/LessonDifficultySelector.tsx
'use client';

import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export const DIFFICULTY_OPTIONS = [
  { value: 1, label: 'Super Simple', color: 'bg-emerald-500', ring: 'ring-emerald-500/40', border: 'border-emerald-500/70', text: 'text-emerald-600' },
  { value: 2, label: 'Approachable', color: 'bg-lime-500', ring: 'ring-lime-500/40', border: 'border-lime-500/70', text: 'text-lime-600' },
  { value: 3, label: 'Intermediate', color: 'bg-amber-500', ring: 'ring-amber-500/40', border: 'border-amber-500/70', text: 'text-amber-600' },
  { value: 4, label: 'Challenging', color: 'bg-orange-500', ring: 'ring-orange-500/40', border: 'border-orange-500/70', text: 'text-orange-600' },
  { value: 5, label: 'Advanced', color: 'bg-rose-500', ring: 'ring-rose-500/40', border: 'border-rose-500/70', text: 'text-rose-600' },
] as const;

export type DifficultyValue = (typeof DIFFICULTY_OPTIONS)[number]['value'];

const clampDifficulty = (value: number | undefined | null): DifficultyValue => {
  if (!value || Number.isNaN(value)) return 3;
  if (value < 1) return 1;
  if (value > 5) return 5;
  return value as DifficultyValue;
};

interface SelectorProps {
  value: number | undefined | null;
  onChange: (value: DifficultyValue) => void;
  disabled?: boolean;
  className?: string;
}

export function LessonDifficultySelector({
  value,
  onChange,
  disabled = false,
  className,
}: SelectorProps) {
  const normalizedValue = clampDifficulty(value);

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <Label className="text-sm font-semibold text-gray-800">
            Difficulty <span className="text-xs font-normal text-gray-500">(required)</span>
          </Label>
          <p className="text-xs text-gray-500">
            One dash = super simple. Five dashes = advanced.
          </p>
        </div>
        <span className="text-sm font-semibold text-gray-700">
          <span className={DIFFICULTY_OPTIONS[normalizedValue - 1].text}>
            {DIFFICULTY_OPTIONS[normalizedValue - 1].label}
          </span>
        </span>
      </div>
      <RadioGroup
        className="gap-2"
        value={String(normalizedValue)}
        onValueChange={(val) => onChange(clampDifficulty(Number(val)))}
        disabled={disabled}
      >
        <div className="flex items-center gap-3">
          {DIFFICULTY_OPTIONS.map((option) => {
            const isActive = normalizedValue === option.value;
            const isFilled = option.value <= normalizedValue;
            return (
              <Label
                key={option.value}
                htmlFor={`difficulty-${option.value}`}
                className={cn(
                  'group relative flex-1 cursor-pointer select-none',
                  disabled && 'cursor-not-allowed opacity-70'
                )}
              >
                <RadioGroupItem
                  value={String(option.value)}
                  id={`difficulty-${option.value}`}
                  className="sr-only"
                  disabled={disabled}
                />
                <span
                  className={cn(
                    'block h-4 rounded-full border-2 border-dashed transition-all duration-200 ease-out',
                    isFilled
                      ? `${option.border} ${option.color}/20 shadow-[0_2px_6px_rgba(0,0,0,0.12)]`
                      : 'border-gray-300 bg-white group-hover:border-gray-400',
                    isActive && `ring-2 ${option.ring}`
                  )}
                  aria-hidden="true"
                />
                <span className="sr-only">{option.label}</span>
              </Label>
            );
          })}
        </div>
      </RadioGroup>
    </div>
  );
}

interface IndicatorProps {
  value: number | undefined | null;
  showLabel?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 'h-2 rounded-full',
  md: 'h-3 rounded-full',
  lg: 'h-4 rounded-full',
} as const;

export function LessonDifficultyIndicator({
  value,
  showLabel = true,
  className,
  size = 'md',
}: IndicatorProps) {
  const normalizedValue = clampDifficulty(value);

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center gap-2">
        {DIFFICULTY_OPTIONS.map((option) => {
          const isFilled = option.value <= normalizedValue;
          const sizeClass = sizeMap[size];
          return (
            <span
              key={option.value}
              className={cn(
                'flex-1 border-2 border-dashed transition-all duration-200',
                sizeClass,
                isFilled ? `${option.border} ${option.color}/25` : 'border-gray-200 bg-transparent'
              )}
              aria-hidden="true"
            />
          );
        })}
      </div>
      {showLabel && (
        <div className={cn('text-[11px] font-semibold uppercase tracking-wide', DIFFICULTY_OPTIONS[normalizedValue - 1].text)}>
          {DIFFICULTY_OPTIONS[normalizedValue - 1].label}
        </div>
      )}
      <span className="sr-only">Lesson difficulty: {DIFFICULTY_OPTIONS[normalizedValue - 1].label}</span>
    </div>
  );
}
