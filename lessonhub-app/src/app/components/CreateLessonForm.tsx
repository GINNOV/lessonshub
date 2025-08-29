// file: src/app/components/CreateLessonForm.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CreateLessonForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [assignmentText, setAssignmentText] = useState('');
  const [contextText, setContextText] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/lessons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          assignmentText,
          contextText,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create lesson');
      }

      // On success, redirect to the dashboard
      router.push('/dashboard');

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-lg space-y-6">
      {error && <p className="text-red-500 bg-red-100 p-3 rounded-md">{error}</p>}

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
          Lesson Title
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          required
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="assignmentText" className="block text-sm font-medium text-gray-700">
          Assignment Description
        </label>
        <textarea
          id="assignmentText"
          value={assignmentText}
          onChange={(e) => setAssignmentText(e.target.value)}
          rows={4}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          required
          disabled={isLoading}
        ></textarea>
      </div>

      <div>
        <label htmlFor="contextText" className="block text-sm font-medium text-gray-700">
          Context / Instructions (Optional)
        </label>
        <textarea
          id="contextText"
          value={contextText}
          onChange={(e) => setContextText(e.target.value)}
          rows={4}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          disabled={isLoading}
        ></textarea>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full px-4 py-2 font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
      >
        {isLoading ? 'Saving...' : 'Save Lesson'}
      </button>
    </form>
  );
}