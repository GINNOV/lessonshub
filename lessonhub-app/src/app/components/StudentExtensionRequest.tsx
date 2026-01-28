'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { requestStudentExtension } from '@/actions/lessonActions';
import { Button } from '@/components/ui/button';
import { Clock, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface StudentExtensionRequestProps {
  assignmentId: string;
  disabled?: boolean;
  locale?: string;
}

export default function StudentExtensionRequest({
  assignmentId,
  disabled = false,
  locale = 'en',
}: StudentExtensionRequestProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const normalizedLocale = locale.toLowerCase();
  const copy = normalizedLocale.startsWith('it')
    ? {
        title: 'Serve più tempo?',
        body: 'Richiedi una proroga di 48 ore per 200 punti. Una proroga per lezione.',
        button: 'Estendi (-200 pt)',
        requesting: 'Richiesta…',
        successTitle: 'Proroga concessa. 200 punti detratti.',
        successBody: 'La tua scadenza è stata spostata di 48 ore.',
        used: 'Una proroga è già stata usata per questa lezione.',
        error: 'Impossibile richiedere una proroga ora.',
      }
    : {
        title: 'Need more time?',
        body: 'Request a 48-hour deadline extension for 200 points. One extension per lesson.',
        button: 'Extend (-200 pts)',
        requesting: 'Requesting…',
        successTitle: 'Extension granted. 200 points deducted.',
        successBody: 'Your deadline has been pushed back by 48 hours.',
        used: 'An extension has already been used for this lesson.',
        error: 'Unable to request an extension right now.',
      };

  const handleRequest = () => {
    startTransition(async () => {
      const result = await requestStudentExtension(assignmentId);
      if (result.success) {
        toast.success(copy.successTitle, {
          description: copy.successBody,
        });
        router.refresh();
      } else {
        toast.error(result.error || copy.error);
      }
    });
  };

  return (
    <div className="mb-6 rounded-lg border border-dashed border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-indigo-700 shadow-sm">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="flex-1 space-y-1 min-w-[220px]">
          <p className="font-semibold">{copy.title}</p>
          <p className="text-xs text-indigo-800">
            {copy.body}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={handleRequest}
          disabled={disabled || isPending}
        >
          <Clock className="mr-2 h-4 w-4" />
          {isPending ? copy.requesting : copy.button}
        </Button>
      </div>
      {disabled && (
        <p className="mt-2 text-xs text-indigo-700">
          {copy.used}
        </p>
      )}
    </div>
  );
}
