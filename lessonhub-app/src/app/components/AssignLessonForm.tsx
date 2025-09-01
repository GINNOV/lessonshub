// file: src/app/components/AssignLessonForm.tsx

'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Assignment, Lesson, User } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface AssignLessonFormProps {
  lesson: Lesson;
  students: User[];
  existingAssignments: Assignment[];
}

export default function AssignLessonForm({ lesson, students, existingAssignments }: AssignLessonFormProps) {
  const router = useRouter();

  const initialAssignedIds = useMemo(() => 
    new Set(existingAssignments.map(a => a.studentId)), 
    [existingAssignments]
  );

  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(
    Array.from(initialAssignedIds)
  );
  
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
      const currentSelectedIds = new Set(selectedStudentIds);

      const studentIdsToAssign = selectedStudentIds.filter(id => !initialAssignedIds.has(id));
      const studentIdsToUnassign = Array.from(initialAssignedIds).filter(id => !currentSelectedIds.has(id));

      const response = await fetch('/api/assignments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId: lesson.id,
          studentIdsToAssign,
          studentIdsToUnassign,
          deadline,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update assignments');
      }

      router.push('/dashboard');
      router.refresh();

    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const hasChanged = useMemo(() => {
    if (selectedStudentIds.length !== initialAssignedIds.size) return true;
    for (const id of selectedStudentIds) {
      if (!initialAssignedIds.has(id)) return true;
    }
    return false;
  }, [selectedStudentIds, initialAssignedIds]);

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && <p className="text-red-500 bg-red-100 p-3 rounded-md">{error}</p>}
      
      <div className="space-y-4 p-4 border rounded-md bg-slate-50">
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
            className="bg-white"
          />
        </div>
        
        <Button
          type="submit"
          disabled={isLoading || !hasChanged}
          className="w-full"
        >
          {isLoading ? 'Updating...' : 'Update Assignments'}
        </Button>
      </div>
      
      <div>
        <Label className="text-lg font-medium">Students</Label>
        <p className="text-sm text-gray-500">Select or deselect students to assign or unassign this lesson.</p>
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
    </form>
  );
}