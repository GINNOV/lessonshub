// file: src/app/components/DeleteLessonButton.tsx

'use client';

import { useState } from 'react';
import { deleteLesson } from '@/actions/lessonActions';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/ConfirmDialog';

interface DeleteLessonButtonProps {
  lessonId: string;
  isIcon?: boolean;
}

export default function DeleteLessonButton({ lessonId, isIcon = false }: DeleteLessonButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleDelete = async () => {
    setIsLoading(true);
    setError(null);
    const result = await deleteLesson(lessonId);
    if (!result.success) {
      setError(result.error || 'An unknown error occurred.');
      setIsLoading(false);
      return;
    }
    setIsDialogOpen(false);
    setIsLoading(false);
  };

  const button = isIcon ? (
    <Button
      variant="destructive"
      size="icon"
      onClick={() => setIsDialogOpen(true)}
      disabled={isLoading}
      title="Delete Lesson"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  ) : (
    <Button
      variant="destructive"
      onClick={() => setIsDialogOpen(true)}
      disabled={isLoading}
    >
      {isLoading ? 'Deleting...' : 'Delete'}
    </Button>
  );

  return (
    <>
      {button}
      <ConfirmDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title="Delete lesson?"
        description="This action cannot be undone and will remove the lesson for all teachers and students."
        confirmLabel="Delete lesson"
        pendingLabel="Deleting..."
        confirmVariant="destructive"
        isConfirming={isLoading}
        onConfirm={handleDelete}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </>
  );
}
