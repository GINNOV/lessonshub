// file: src/app/components/FailButton.tsx

'use client';

import { useState } from 'react';
import { failAssignment } from '@/actions/lessonActions';
import { Button } from '@/components/ui/button';

interface FailButtonProps {
  assignmentId: string;
}

export default function FailButton({ assignmentId }: FailButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    // Show a confirmation dialog before proceeding
    const confirmed = window.confirm("Are you sure you want to fail this student for this assignment?");
    
    if (confirmed) {
      setIsLoading(true);
      setError(null);
      const result = await failAssignment(assignmentId);
      if (result && !result.success) {
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
        size="sm"
      >
        {isLoading ? 'Failing...' : 'Fail'}
      </Button>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </>
  );
}