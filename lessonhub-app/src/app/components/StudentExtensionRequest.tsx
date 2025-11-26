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
}

export default function StudentExtensionRequest({
  assignmentId,
  disabled = false,
}: StudentExtensionRequestProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleRequest = () => {
    startTransition(async () => {
      const result = await requestStudentExtension(assignmentId);
      if (result.success) {
        toast.success('Extension granted. 200 points deducted.', {
          description: 'Your deadline has been pushed back by 48 hours.',
        });
        router.refresh();
      } else {
        toast.error(result.error || 'Unable to request an extension right now.');
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
          <p className="font-semibold">Need more time?</p>
          <p className="text-xs text-indigo-800">
            Request a 48-hour deadline extension for 200 points. One extension per lesson.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={handleRequest}
          disabled={disabled || isPending}
        >
          <Clock className="mr-2 h-4 w-4" />
          {isPending ? 'Requesting…' : 'Extend (-200 pts)'}
        </Button>
      </div>
      {disabled && (
        <p className="mt-2 text-xs text-indigo-700">
          You&apos;ve already used your extension for this lesson.
        </p>
      )}
    </div>
  );
}
