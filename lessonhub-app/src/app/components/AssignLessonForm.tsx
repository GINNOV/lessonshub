'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Assignment, Lesson, User } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

type StudentWithStats = User & {
  totalPoints: number;
  lastSeen?: Date | null;
};

interface AssignLessonFormProps {
  lesson: Lesson;
  students: StudentWithStats[];
  existingAssignments: Assignment[];
}

export default function AssignLessonForm({ lesson, students, existingAssignments }: AssignLessonFormProps) {
  const router = useRouter();

  const assignmentDetailsMap = useMemo(() => {
    const map = new Map<string, { assignedAt: Date; deadline: Date }>();
    existingAssignments.forEach(a => {
      map.set(a.studentId, { assignedAt: a.assignedAt, deadline: a.deadline });
    });
    return map;
  }, [existingAssignments]);

  const initialAssignedIds = useMemo(() => 
    new Set(existingAssignments.map(a => a.studentId)), 
    [existingAssignments]
  );

  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(
    Array.from(initialAssignedIds)
  );
  
  const [deadline, setDeadline] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const defaultDeadline = new Date(Date.now() + 36 * 60 * 60 * 1000);
    const formattedDeadline = defaultDeadline.toISOString().slice(0, 16);
    setDeadline(formattedDeadline);
  }, []);

  const filteredStudents = useMemo(() => {
    return students.filter(student => 
      student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [students, searchTerm]);

  const handleStudentSelect = (studentId: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };
  
  const handleSelectAll = () => {
    setSelectedStudentIds(filteredStudents.map(s => s.id));
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
      {error && <p className="text-red-500 bg-red-100 p-3 rounded-md">{error}</p>}
      
      <div className="space-y-4 p-4 border rounded-lg bg-slate-50 sticky top-20 z-10">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="w-full sm:w-auto">
            <Label htmlFor="deadline" className="block text-sm font-medium text-gray-700 mb-1">
              Deadline for New Assignments
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
      
      <div className="p-4 border rounded-lg flex flex-col h-full">
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <Input
            type="search"
            placeholder="Search students by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:flex-grow"
          />
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={handleSelectAll}>Select All</Button>
            <Button type="button" variant="outline" onClick={handleDeselectAll}>Deselect All</Button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-6 py-3 text-left w-12"><span className="sr-only">Select</span></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Points</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Seen</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStudents.map(student => {
                const assignmentDetails = assignmentDetailsMap.get(student.id);
                return (
                  <tr key={student.id}>
                    <td className="px-6 py-4">
                      <Input
                        id={`student-${student.id}`}
                        type="checkbox"
                        className="h-4 w-4 rounded"
                        checked={selectedStudentIds.includes(student.id)}
                        onChange={() => handleStudentSelect(student.id)}
                        disabled={isLoading}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{student.name || 'N/A'}</div>
                      <div className="text-sm text-gray-500">{student.email}</div>
                      {/* --- Displays the assignment date/time --- */}
                      {assignmentDetails && (
                        <div className="text-xs text-gray-400 mt-1">
                          Assigned: {new Date(assignmentDetails.assignedAt).toLocaleString()}
                          <br />
                          Deadline: {new Date(assignmentDetails.deadline).toLocaleString()}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.totalPoints}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {student.lastSeen ? new Date(student.lastSeen).toLocaleString() : 'Never'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </form>
  );
}