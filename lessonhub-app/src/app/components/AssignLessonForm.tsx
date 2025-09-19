// file: src/app/components/AssignLessonForm.tsx
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Assignment, Lesson, User } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import LocaleDate from './LocaleDate';

export type StudentWithStats = User & {
  totalPoints: number;
};

interface AssignLessonFormProps {
  lesson: Omit<Lesson, 'price'> & { price: number };
  students: StudentWithStats[];
  existingAssignments: Assignment[];
}

const formatDateTimeForInput = (date: Date | null | undefined): string => {
    if (!date) return '';
    try {
        const d = new Date(date);
        const timezoneOffset = d.getTimezoneOffset() * 60000;
        const localDate = new Date(d.getTime() - timezoneOffset);
        return localDate.toISOString().slice(0, 16);
    } catch (e) {
        return '';
    }
};

export default function AssignLessonForm({
  lesson,
  students,
  existingAssignments,
}: AssignLessonFormProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [deadlines, setDeadlines] = useState<Record<string, string>>({});
  const [notifyStudents, setNotifyStudents] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [masterDeadline, setMasterDeadline] = useState<string>('');
  
  const existingAssignmentsMap = useMemo(() => 
    new Map(existingAssignments.map(a => [a.studentId, a])), 
  [existingAssignments]);

  useEffect(() => {
    const initialDeadlines: Record<string, string> = {};
    const initialSelected: string[] = [];
    existingAssignments.forEach(a => {
      initialDeadlines[a.studentId] = formatDateTimeForInput(a.deadline);
      initialSelected.push(a.studentId);
    });
    setDeadlines(initialDeadlines);
    setSelectedStudents(initialSelected);
    // Set master deadline to the first found deadline
    if (existingAssignments.length > 0) {
        setMasterDeadline(formatDateTimeForInput(existingAssignments[0].deadline));
    }
  }, [existingAssignments]);

  const filteredStudents = useMemo(() => {
    return students.filter(
      (student) =>
        student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [students, searchTerm]);

  const handleSelectStudent = (studentId: string, isSelected: boolean) => {
    setSelectedStudents((prev) =>
      isSelected
        ? [...prev, studentId]
        : prev.filter((id) => id !== studentId)
    );
  };

  const handleSelectAll = (isSelected: boolean) => {
    setSelectedStudents(isSelected ? filteredStudents.map(s => s.id) : []);
  };
  
  const handleMasterDeadlineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDeadline = e.target.value;
    setMasterDeadline(newDeadline);
    setDeadlines(prev => {
        const newDeadlines = { ...prev };
        selectedStudents.forEach(studentId => {
            newDeadlines[studentId] = newDeadline;
        });
        return newDeadlines;
    });
  };

  const handleIndividualDeadlineChange = (studentId: string, value: string) => {
    setDeadlines(prev => ({ ...prev, [studentId]: value }));
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const initialAssignedStudents = new Set(existingAssignments.map(a => a.studentId));
    
    // Determine who to create, update, or delete
    const studentIdsToUnassign = Array.from(initialAssignedStudents).filter(id => !selectedStudents.includes(id));
    
    const assignmentsToUpsert = selectedStudents.map(id => {
        if (!deadlines[id]) {
            toast.error(`Please provide a deadline for ${students.find(s => s.id === id)?.name}.`);
            return null;
        }
        return {
            studentId: id,
            deadline: deadlines[id],
        };
    }).filter(Boolean);

    if (assignmentsToUpsert.length !== selectedStudents.length) {
        setIsLoading(false);
        return;
    }

    try {
      const response = await fetch('/api/assignments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId: lesson.id,
          studentIdsToAssign: assignmentsToUpsert.filter(a => !initialAssignedStudents.has(a!.studentId)).map(a => a!),
          studentIdsToUpdate: assignmentsToUpsert.filter(a => initialAssignedStudents.has(a!.studentId)).map(a => a!),
          studentIdsToUnassign,
          notifyStudents,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update assignments');
      }
      
      toast.success('Assignments updated successfully!');
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const areAllFilteredSelected = filteredStudents.length > 0 && selectedStudents.length >= filteredStudents.length && filteredStudents.every(s => selectedStudents.includes(s.id));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
            <Label htmlFor="deadline">Set Deadline for Selected Students</Label>
            <Input
            id="deadline"
            type="datetime-local"
            value={masterDeadline}
            onChange={handleMasterDeadlineChange}
            />
        </div>
        <div className="space-y-2">
            <Label htmlFor="search">Search Students</Label>
            <Input
            id="search"
            type="search"
            placeholder="Filter by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="notify"
          checked={notifyStudents}
          onCheckedChange={(checked) => setNotifyStudents(!!checked)}
        />
        <Label htmlFor="notify">Notify newly assigned students via email</Label>
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
                <tr>
                    <th className="px-4 py-3 text-left">
                        <Checkbox
                            id="select-all"
                            checked={areAllFilteredSelected}
                            onCheckedChange={handleSelectAll}
                        />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Points</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deadline</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.map((student) => (
                    <tr key={student.id}>
                        <td className="px-4 py-4">
                            <Checkbox
                                id={student.id}
                                checked={selectedStudents.includes(student.id)}
                                onCheckedChange={(checked) => handleSelectStudent(student.id, !!checked)}
                            />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.totalPoints}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <Input
                                type="datetime-local"
                                value={deadlines[student.id] || ''}
                                onChange={(e) => handleIndividualDeadlineChange(student.id, e.target.value)}
                                className="text-sm"
                            />
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Saving...' : 'Save Assignments'}
      </Button>
    </form>
  );
}

