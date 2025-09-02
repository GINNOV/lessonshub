// file: src/app/components/DeleteLessonButton.tsx

'use client';

import { useState } from 'react';
import { deleteLesson } from '@/actions/lessonActions';
import { Button } from '@/components/ui/button';

interface DeleteLessonButtonProps {
  lessonId: string;
}

export default function DeleteLessonButton({ lessonId }: DeleteLessonButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    // Show a confirmation dialog before proceeding
    const confirmed = window.confirm("Are you sure you want to delete this lesson? This action cannot be undone.");
    
    if (confirmed) {
      setIsLoading(true);
      setError(null);
      const result = await deleteLesson(lessonId);
      if (!result.success) {
        setError(result.error || 'An unknown error occurred.');
      }
      // The page will be revalidated by the server action on success.
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="destructive"
        onClick={handleClick}
        disabled={isLoading}
      >
        {isLoading ? 'Deleting...' : 'Delete'}
      </Button>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </>
  );
}