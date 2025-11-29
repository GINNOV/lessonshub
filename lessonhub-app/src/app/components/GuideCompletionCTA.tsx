'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface GuideCompletionCTAProps {
  guideId: string;
  defaultCompleted: boolean;
  pointsPerGuide: number;
}

export default function GuideCompletionCTA({
  guideId,
  defaultCompleted,
  pointsPerGuide,
}: GuideCompletionCTAProps) {
  const router = useRouter();
  const [completed, setCompleted] = useState(defaultCompleted);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/guides/${guideId}/complete`, {
        method: 'POST',
      });
      const data = await response.json().catch(() => null);

      if (response.ok && data?.success) {
        toast.success(`Guide completed! +${pointsPerGuide} read-along points awarded.`);
        setCompleted(true);
        startTransition(() => {
          router.refresh();
        });
      } else if (data?.alreadyCompleted) {
        toast.info('You have already completed this guide.');
        setCompleted(true);
        startTransition(() => {
          router.refresh();
        });
      } else {
        toast.error(data?.error || 'Unable to mark this guide as completed.');
      }
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (completed) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        <p className="font-semibold">Guide completed</p>
        <p>Thanks for exploring! Your read-along balance has been updated.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-gray-900">Finished this guide?</p>
          <p className="text-sm text-gray-600">
            Confirm completion to earn +{pointsPerGuide} read-along points for limited lyric lessons.
          </p>
        </div>
        <Button type="button" onClick={handleComplete} disabled={isSubmitting || isPending}>
          {isSubmitting || isPending ? 'Saving…' : `Mark as completed (+${pointsPerGuide})`}
        </Button>
      </div>
    </div>
  );
}
