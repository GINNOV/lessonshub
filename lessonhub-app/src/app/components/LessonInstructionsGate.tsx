'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle } from 'lucide-react';

type LessonInstructionsGateProps = {
  instructionsHtml: string | null;
  children: React.ReactNode;
};

export default function LessonInstructionsGate({ instructionsHtml, children }: LessonInstructionsGateProps) {
  const hasInstructions = useMemo(() => Boolean(instructionsHtml && instructionsHtml.trim().length > 0), [instructionsHtml]);
  const [acknowledged, setAcknowledged] = useState(!hasInstructions);
  const [checked, setChecked] = useState(!hasInstructions);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-sm">
        <div className="flex items-center gap-2 text-amber-900">
          <AlertCircle className="h-5 w-5" />
          <h2 className="text-lg font-semibold uppercase tracking-wide">Instructions</h2>
        </div>
        <div
          className="prose prose-sm mt-3 max-w-none text-amber-900"
          dangerouslySetInnerHTML={{
            __html: hasInstructions ? (instructionsHtml as string) : '<p>No instructions provided.</p>',
          }}
        />
        {hasInstructions && (
          <div className="mt-4 flex flex-col gap-3 rounded-lg border border-amber-200 bg-white/80 p-3 sm:flex-row sm:items-center sm:justify-between">
            <label htmlFor="acknowledge-instructions" className="flex items-start gap-3 text-sm text-amber-900">
              <Checkbox
                id="acknowledge-instructions"
                checked={checked}
                onCheckedChange={(value) => setChecked(Boolean(value))}
                className="mt-0.5 shrink-0 border-amber-400 text-amber-500"
              />
              <span className="flex flex-col leading-snug">
                <span>I&apos;ve read and understood the instructions above.</span>
                <span>🇮🇹 Ho letto e compreso le istruzioni.</span>
              </span>
            </label>
            <Button
              type="button"
              variant="default"
              disabled={!checked}
              onClick={() => setAcknowledged(true)}
            >
              Continue
            </Button>
          </div>
        )}
      </div>

      {acknowledged ? (
        children
      ) : (
        <div className="rounded-lg border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
          Review and acknowledge the instructions before unlocking the rest of this lesson.
        </div>
      )}
    </div>
  );
}
