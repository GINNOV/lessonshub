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
  { label: 'Good', value: 10 },
  { label: 'Almost Right', value: 2 },
  { label: 'Bad', value: -1 },
];

export default function GradingForm({ assignment }: GradingFormProps) {
  const router = useRouter();
  const [score, setScore] = useState<number | null>(assignment.score ?? null);
  const [teacherComments, setTeacherComments] = useState(assignment.teacherComments || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (score === null) {
      setError('Please select a score.');
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/assignments/${assignment.id}/grade`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score, teacherComments }),
      });
      if (!response.ok) throw new Error('Failed to submit grade.');
      
      router.push(`/dashboard/submissions/${assignment.lessonId}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
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
          // This line is changed from `defaultValue` to `value`
          value={score?.toString()} 
          onValueChange={(value) => setScore(Number(value))} 
          className="mt-2"
        >
          {scoreOptions.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <RadioGroupItem value={option.value.toString()} id={option.label} />
              <Label htmlFor={option.label}>
                {option.label} ({option.value} points)
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>
      <div>
        <Label htmlFor="comments">Comments</Label>
        <Textarea
          id="comments"
          value={teacherComments}
          onChange={(e) => setTeacherComments(e.target.value)}
          placeholder="Provide feedback for the student..."
        />
      </div>
      <Button
        type="submit"
        disabled={isLoading}
        className="w-full"
      >
        {isLoading ? 'Submitting...' : 'Submit Grade'}
      </Button>
    </form>
  );
}