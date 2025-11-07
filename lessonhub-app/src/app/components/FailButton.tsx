// file: src/app/components/FailButton.tsx

'use client';

import { useState } from 'react';
import { failAssignment } from '@/actions/lessonActions';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ConfirmDialog';

interface FailButtonProps {
  assignmentId: string;
}

export default function FailButton({ assignmentId }: FailButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    setError(null);
    const result = await failAssignment(assignmentId);
    if (!result?.success) {
      setError(result?.error || 'An unknown error occurred.');
      setIsLoading(false);
      return;
    }
    setIsDialogOpen(false);
    setIsLoading(false);
  };

  return (
    <>
      <Button
        variant="destructive"
        onClick={() => setIsDialogOpen(true)}
        disabled={isLoading}
        size="sm"
      >
        {isLoading ? 'Failing...' : 'Fail'}
      </Button>
      <ConfirmDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title="Fail assignment?"
        description="This will mark the assignment as failed and notify the student."
        confirmLabel="Fail student"
        pendingLabel="Failing..."
        confirmVariant="destructive"
        isConfirming={isLoading}
        onConfirm={handleConfirm}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </>
  );
}
