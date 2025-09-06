// file: src/app/components/DeleteLessonButton.tsx

'use client';

import { useState } from 'react';
import { deleteLesson } from '@/actions/lessonActions';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

interface DeleteLessonButtonProps {
  lessonId: string;
  isIcon?: boolean;
}

export default function DeleteLessonButton({ lessonId, isIcon = false }: DeleteLessonButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    const confirmed = window.confirm("Are you sure you want to delete this lesson? This action cannot be undone.");
    
    if (confirmed) {
      setIsLoading(true);
      setError(null);
      const result = await deleteLesson(lessonId);
      if (!result.success) {
        setError(result.error || 'An unknown error occurred.');
      }
      setIsLoading(false);
    }
  };

  if (isIcon) {
    return (
      <Button
        variant="destructive"
        size="icon"
        onClick={handleClick}
        disabled={isLoading}
        title="Delete Lesson"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    );
  }

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