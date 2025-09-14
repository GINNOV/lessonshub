// file: src/app/components/AssignLessonForm.tsx
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Assignment, Lesson, User } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

type StudentWithStats = User & {
  totalPoints: number;
  lastSeen?: Date | null;
};

interface AssignLessonFormProps {
  lesson: Lesson;
  students: StudentWithStats[];
  existingAssignments: Assignment[];
}

export default function AssignLessonForm({
  lesson,
  students,
  existingAssignments,
}: AssignLessonFormProps) {
  const router = useRouter();

  const assignmentDetailsMap = useMemo(() => {
    const map = new Map<string, { assignedAt: Date; deadline: Date }>();
    existingAssignments.forEach((a) => {
      map.set(a.studentId, {
        assignedAt: a.assignedAt,
        deadline: a.deadline,
      });
    });
    return map;
  }, [existingAssignments]);

  const initialAssignedIds = useMemo(
    () => new Set(existingAssignments.map((a) => a.studentId)),
    [existingAssignments]
  );

  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(
    Array.from(initialAssignedIds)
  );

  const [deadline, setDeadline] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notifyStudents, setNotifyStudents] = useState(true);

  useEffect(() => {
    const defaultDeadline = new Date(Date.now() + 36 * 60 * 60 * 1000);
    const formattedDeadline = defaultDeadline.toISOString().slice(0, 16);
    setDeadline(formattedDeadline);
  }, []);

  const filteredStudents = useMemo(() => {
    return students.filter(
      (student) =>
        student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [students, searchTerm]);

  const handleStudentSelect = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSelectAll = () => {
    setSelectedStudentIds(filteredStudents.map((s) => s.id));
  };

  const handleDeselectAll = () => {
    setSelectedStudentIds([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const currentSelectedIds = new Set(selectedStudentIds);
      const studentIdsToAssign = selectedStudentIds.filter(
        (id) => !initialAssignedIds.has(id)
      );
      const studentIdsToUnassign = Array.from(initialAssignedIds).filter(
        (id) => !currentSelectedIds.has(id)
      );

      const response = await fetch('/api/assignments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId: lesson.id,
          studentIdsToAssign,
          studentIdsToUnassign,
          deadline,
          notifyStudents,
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
    const initialIds = new Set(initialAssignedIds);
    const selectedIds = new Set(selectedStudentIds);

    if (initialIds.size !== selectedIds.size) return true;
    for (const id of initialIds) {
      if (!selectedIds.has(id)) return true;
    }
    return false;
  }, [selectedStudentIds, initialAssignedIds]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <p className="rounded-md bg-red-100 p-3 text-red-500">{error}</p>
      )}

      <div className="sticky top-20 z-10 space-y-4 rounded-lg border bg-slate-50 p-4">
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <div className="w-full sm:w-auto">
            <Label
              htmlFor="deadline"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Deadline for New Assignments
            </Label>
            <Input
              type="datetime-local"
              id="deadline"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              required
              disabled={isLoading}
              className="bg-white"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="notify"
              checked={notifyStudents}
              onCheckedChange={(checked) => setNotifyStudents(Boolean(checked))}
              disabled={isLoading}
            />
            <Label htmlFor="notify">Notify newly assigned students</Label>
          </div>
          <div className="flex-grow"></div>
          <Button
            type="submit"
            disabled={isLoading || !hasChanged}
            className="w-full sm:w-auto"
          >
            {isLoading ? 'Updating...' : 'Update Assignments'}
          </Button>
        </div>
      </div>

      <div className="flex h-full flex-col rounded-lg border p-4">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row">
          <Input
            type="search"
            placeholder="Search students by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:flex-grow"
          />
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={handleSelectAll}>
              Select All
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleDeselectAll}
            >
              Deselect All
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="sticky top-0 bg-gray-50">
              <tr>
                <th className="w-12 px-6 py-3 text-left">
                  <span className="sr-only">Select</span>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Total Points
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Last Seen
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredStudents.map((student) => {
                const assignmentDetails = assignmentDetailsMap.get(student.id);
                return (
                  <tr key={student.id}>
                    <td className="px-6 py-4">
                      <Checkbox
                        id={`student-${student.id}`}
                        checked={selectedStudentIds.includes(student.id)}
                        onCheckedChange={() => handleStudentSelect(student.id)}
                        disabled={isLoading}
                        aria-label={`Select ${student.name}`}
                      />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {student.name || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {student.email}
                      </div>
                      {assignmentDetails && (
                        <div className="mt-1 text-xs text-gray-400">
                          Assigned:{' '}
                          {new Date(
                            assignmentDetails.assignedAt
                          ).toLocaleString()}
                          <br />
                          Deadline:{' '}
                          {new Date(
                            assignmentDetails.deadline
                          ).toLocaleString()}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {student.totalPoints}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {student.lastSeen
                        ? new Date(student.lastSeen).toLocaleString()
                        : 'Never'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </form>
  );
}