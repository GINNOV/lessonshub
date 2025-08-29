// file: src/app/components/GradingForm.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Assignment } from '@prisma/client';

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
  const [score, setScore] = useState<number | null>(null);
  const [teacherComments, setTeacherComments] = useState('');
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
    <form onSubmit={handleSubmit} className="mt-8 border-t pt-6 space-y-6">
      {error && <p className="text-red-500">{error}</p>}
      <div>
        <h3 className="text-lg font-medium text-gray-900">Score</h3>
        <fieldset className="mt-2">
          <legend className="sr-only">Scoring options</legend>
          <div className="space-y-2">
            {scoreOptions.map((option) => (
              <div key={option.value} className="flex items-center">
                <input
                  id={option.label}
                  name="score"
                  type="radio"
                  value={option.value}
                  onChange={(e) => setScore(Number(e.target.value))}
                  className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                />
                <label htmlFor={option.label} className="ml-3 block text-sm font-medium text-gray-700">
                  {option.label} ({option.value} points)
                </label>
              </div>
            ))}
          </div>
        </fieldset>
      </div>
      <div>
        <label htmlFor="comments" className="block text-sm font-medium text-gray-700">Comments</label>
        <textarea
          id="comments"
          rows={4}
          value={teacherComments}
          onChange={(e) => setTeacherComments(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          placeholder="Provide feedback for the student..."
        />
      </div>
      <button
        type="submit"
        disabled={isLoading}
        className="w-full px-4 py-2 font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
      >
        {isLoading ? 'Submitting...' : 'Submit Grade'}
      </button>
    </form>
  );
}