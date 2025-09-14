// file: src/app/components/GradingForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Assignment } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';

interface GradingFormProps {
  assignment: Assignment;
}

const scoreOptions = [
  { label: 'Good', value: '10' },
  { label: 'Almost Right', value: '2' },
  { label: 'Bad', value: '-1' },
];

export default function GradingForm({ assignment }: GradingFormProps) {
  const router = useRouter();

  // ✅ FIX: Simplified state to a single string value to handle both radio and select inputs cleanly.
  // This removes the need for a useEffect to sync multiple state variables.
  const [scoreValue, setScoreValue] = useState(
    assignment.score?.toString() ?? ''
  );
  const [teacherComments, setTeacherComments] = useState(
    assignment.teacherComments || ''
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (scoreValue === '') {
      setError('Please select a score.');
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/assignments/${assignment.id}/grade`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        // ✨ REFINEMENT: Parse the final score value to a number on submission.
        body: JSON.stringify({
          score: Number(scoreValue),
          teacherComments,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit grade.');
      }

      router.push(`/dashboard/submissions/${assignment.lessonId}`);
      router.refresh();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <p className="text-red-500">{error}</p>}
      <div>
        <Label className="text-base font-medium text-gray-900">Score</Label>
        <RadioGroup
          value={scoreValue}
          onValueChange={setScoreValue}
          className="mt-2"
        >
          {scoreOptions.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <RadioGroupItem value={option.value} id={option.label} />
              <Label htmlFor={option.label}>
                {option.label} ({option.value} points)
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label htmlFor="custom-score">Custom Score (Overrides Above)</Label>
        <select
          id="custom-score"
          value={scoreValue}
          onChange={(e) => setScoreValue(e.target.value)}
          className="w-full rounded-md border border-gray-300 p-2 shadow-sm"
        >
          <option value="">Select a score</option>
          {Array.from({ length: 11 }, (_, i) => i).map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="comments">Comments (Markdown supported)</Label>
        <Textarea
          id="comments"
          value={teacherComments}
          onChange={(e) => setTeacherComments(e.target.value)}
          placeholder="Provide feedback for the student... You can use markdown for **bold**, *italics*, etc."
        />
      </div>
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Submitting...' : 'Submit Grade'}
      </Button>
    </form>
  );
}