// file: src/app/components/ExtendDeadlineButton.tsx
'use client';

import { useState } from 'react';
import { extendDeadline } from '@/actions/lessonActions';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';
import { toast } from 'sonner';

interface ExtendDeadlineButtonProps {
  assignmentId: string;
}

export default function ExtendDeadlineButton({ assignmentId }: ExtendDeadlineButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    const confirmed = window.confirm("Are you sure you want to extend the deadline by 48 hours?");
    
    if (confirmed) {
      setIsLoading(true);
      const result = await extendDeadline(assignmentId);
      if (result.success) {
        toast.success('Deadline extended successfully!');
      } else {
        toast.error(result.error || 'An unknown error occurred.');
      }
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={isLoading}
    >
      <Clock className="mr-2 h-4 w-4" />
      {isLoading ? 'Extending...' : 'Extend Deadline'}
    </Button>
  );
}