// file: src/app/components/GradingForm.tsx

'use client';

import { useState, useEffect } from 'react';
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
  const [customScore, setCustomScore] = useState('');
  const [teacherComments, setTeacherComments] = useState(assignment.teacherComments || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize custom score dropdown if the score is not one of the radio options
    if (score !== null && !scoreOptions.some(opt => opt.value === score)) {
      setCustomScore(score.toString());
    }
  }, [score]);
  
  const handleRadioChange = (value: string) => {
    setScore(Number(value));
    setCustomScore(''); // Reset custom score when radio is selected
  };
  
  const handleCustomScoreChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setCustomScore(value);
    setScore(value ? Number(value) : null);
  };

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
    } catch (err: unknown) { // Corrected type
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
          value={scoreOptions.some(opt => opt.value === score) ? score?.toString() : ''} 
          onValueChange={handleRadioChange} 
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
      
      <div className="space-y-2">
        <Label htmlFor="custom-score">Custom Score</Label>
        <select
          id="custom-score"
          value={customScore}
          onChange={handleCustomScoreChange}
          className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
        >
          <option value="">Select a score</option>
          {Array.from({ length: 11 }, (_, i) => i).map((value) => (
            <option key={value} value={value}>{value}</option>
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