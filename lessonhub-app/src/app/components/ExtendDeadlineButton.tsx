// file: src/app/components/ExtendDeadlineButton.tsx
'use client';

import { useState } from 'react';
import { extendDeadline } from '@/actions/lessonActions';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ConfirmDialog';

interface ExtendDeadlineButtonProps {
  assignmentId: string;
}

export default function ExtendDeadlineButton({ assignmentId }: ExtendDeadlineButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    const result = await extendDeadline(assignmentId);
    if (result.success) {
      toast.success('Deadline extended successfully!');
    } else {
      toast.error(result.error || 'An unknown error occurred.');
    }
    setIsDialogOpen(false);
    setIsLoading(false);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsDialogOpen(true)}
        disabled={isLoading}
      >
        <Clock className="mr-2 h-4 w-4" />
        {isLoading ? 'Extending...' : 'Extend Deadline'}
      </Button>
      <ConfirmDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title="Extend deadline?"
        description="Adds 48 hours to the current deadline and notifies the student."
        confirmLabel="Extend deadline"
        pendingLabel="Extending..."
        confirmVariant="default"
        isConfirming={isLoading}
        onConfirm={handleConfirm}
      />
    </>
  );
}
