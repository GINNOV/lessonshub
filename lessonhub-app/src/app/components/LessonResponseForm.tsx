// file: src/app/components/LessonResponseForm.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Assignment } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface LessonResponseFormProps {
  assignment: Assignment;
}

export default function LessonResponseForm({ assignment }: LessonResponseFormProps) {
  const router = useRouter();
  const [responseText, setResponseText] = useState(assignment.responseText || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const isPastDeadline = new Date() > new Date(assignment.deadline);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/assignments/${assignment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responseText }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit response');
      }

      router.push('/my-lessons');
      router.refresh();

    } catch (err: unknown) { // Corrected type
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-8 border-t pt-6">
      <h2 className="text-xl font-semibold mb-4">Your Response</h2>
      {error && <p className="text-red-500 bg-red-100 p-3 rounded-md mb-4">{error}</p>}
      
      <Textarea
        className="min-h-[150px]"
        placeholder="Type your answer here..."
        value={responseText}
        onChange={(e) => setResponseText(e.target.value)}
        disabled={isLoading || isPastDeadline}
      />

      <Button
        type="submit"
        disabled={isLoading || isPastDeadline}
        className="mt-4"
      >
        {isPastDeadline ? 'Deadline Passed' : (isLoading ? 'Submitting...' : 'Submit Response')}
      </Button>
    </form>
  );
}