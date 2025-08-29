// file: src/app/components/AssignLessonForm.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lesson, User } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

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

      router.push('/dashboard');
      router.refresh();

    } catch (err: unknown) { // Corrected type
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && <p className="text-red-500 bg-red-100 p-3 rounded-md">{error}</p>}
      
      <div>
        <Label className="text-lg font-medium">Students</Label>
        <div className="mt-4 space-y-2 max-h-60 overflow-y-auto border p-4 rounded-md">
          {students.map(student => (
            <div key={student.id} className="flex items-center">
              <Input
                id={`student-${student.id}`}
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                checked={selectedStudentIds.includes(student.id)}
                onChange={() => handleStudentSelect(student.id)}
                disabled={isLoading}
              />
              <Label htmlFor={`student-${student.id}`} className="ml-3 block text-sm font-medium text-gray-700">
                {student.email}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="deadline" className="block text-sm font-medium text-gray-700">
          Deadline
        </Label>
        <Input
          type="datetime-local"
          id="deadline"
          value={deadline}
          onChange={e => setDeadline(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>
      
      <Button
        type="submit"
        disabled={isLoading || selectedStudentIds.length === 0}
        className="w-full"
      >
        {isLoading ? 'Assigning...' : 'Confirm Assignment'}
      </Button>
    </form>
  );
}