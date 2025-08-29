// file: src/app/components/AssignLessonForm.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lesson, User } from '@prisma/client';

interface AssignLessonFormProps {
  lesson: Lesson;
  students: User[];
}

export default function AssignLessonForm({ lesson, students }: AssignLessonFormProps) {
  const router = useRouter();
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [deadline, setDeadline] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStudentSelect = (studentId: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId: lesson.id,
          studentIds: selectedStudentIds,
          deadline,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to assign lesson');
      }

      // On success, redirect to the dashboard
      router.push('/dashboard');
      router.refresh(); // Refreshes the server components on the dashboard

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && <p className="text-red-500 bg-red-100 p-3 rounded-md">{error}</p>}

      <div>
        <h3 className="text-lg font-medium">Students</h3>
        <div className="mt-4 space-y-2 max-h-60 overflow-y-auto border p-4 rounded-md">
          {students.map(student => (
            <div key={student.id} className="flex items-center">
              <input
                id={`student-${student.id}`}
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                checked={selectedStudentIds.includes(student.id)}
                onChange={() => handleStudentSelect(student.id)}
                disabled={isLoading}
              />
              <label htmlFor={`student-${student.id}`} className="ml-3 block text-sm font-medium text-gray-700">
                {student.email}
              </label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="deadline" className="block text-sm font-medium text-gray-700">
          Deadline
        </label>
        <input
          type="datetime-local"
          id="deadline"
          value={deadline}
          onChange={e => setDeadline(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          required
          disabled={isLoading}
        />
      </div>

      <button
        type="submit"
        disabled={isLoading || selectedStudentIds.length === 0}
        className="w-full px-4 py-2 font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
      >
        {isLoading ? 'Assigning...' : 'Confirm Assignment'}
      </button>
    </form>
  );
}