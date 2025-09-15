// file: src/app/components/GradingForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Assignment } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { gradeAssignment } from '@/actions/lessonActions';
import { toast } from 'sonner';

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
  const [scoreValue, setScoreValue] = useState(
    assignment.score?.toString() ?? ''
  );
  const [teacherComments, setTeacherComments] = useState(
    assignment.teacherComments || ''
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (scoreValue === '') {
      toast.error('Please select a score.');
      return;
    }
    setIsLoading(true);

    const result = await gradeAssignment(assignment.id, {
      score: Number(scoreValue),
      teacherComments,
    });

    if (result.success) {
      toast.success('Grade submitted successfully!');
      router.push(`/dashboard/submissions/${assignment.lessonId}`);
      router.refresh();
    } else {
      toast.error(result.error || 'Failed to submit grade.');
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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