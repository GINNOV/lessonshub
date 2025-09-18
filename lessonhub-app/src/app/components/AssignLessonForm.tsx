// file: src/app/components/AssignLessonForm.tsx
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Assignment, Lesson, User } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

// Define the shape of the student data the component expects
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
        // Adjust for timezone offset to display local time correctly in the input
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
  const [selectedStudents, setSelectedStudents] = useState<string[]>(() =>
    existingAssignments.map((a) => a.studentId)
  );
  const [deadline, setDeadline] = useState<string>(() => {
      const firstAssignment = existingAssignments[0];
      return formatDateTimeForInput(firstAssignment?.deadline);
  });
  const [notifyStudents, setNotifyStudents] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const initialAssignedStudents = useMemo(() => new Set(existingAssignments.map(a => a.studentId)), [existingAssignments]);

  const handleSelectStudent = (studentId: string, isSelected: boolean) => {
    setSelectedStudents((prev) =>
      isSelected
        ? [...prev, studentId]
        : prev.filter((id) => id !== studentId)
    );
  };

  const handleSelectAll = (isSelected: boolean) => {
    setSelectedStudents(isSelected ? students.map(s => s.id) : []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const studentIdsToAssign = selectedStudents.filter(id => !initialAssignedStudents.has(id));
    const studentIdsToUnassign = Array.from(initialAssignedStudents).filter(id => !selectedStudents.includes(id));
    
    if (studentIdsToAssign.length > 0 && !deadline) {
      toast.error('A deadline is required when assigning lessons to new students.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/assignments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId: lesson.id,
          studentIdsToAssign,
          studentIdsToUnassign,
          deadline: deadline || null, // Send null if only unassigning
          notifyStudents,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update assignments');
      }
      
      toast.success('Assignments updated successfully!');
      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const areAllSelected = students.length > 0 && selectedStudents.length === students.length;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="deadline">Deadline</Label>
        <Input
          id="deadline"
          type="datetime-local"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="notify"
          checked={notifyStudents}
          onCheckedChange={(checked) => setNotifyStudents(!!checked)}
        />
        <Label htmlFor="notify">Notify newly assigned students via email</Label>
      </div>

      <div className="rounded-lg border">
        <div className="flex items-center p-4 border-b">
            <Checkbox
                id="select-all"
                checked={areAllSelected}
                onCheckedChange={handleSelectAll}
                className="mr-2"
            />
            <Label htmlFor="select-all" className="font-semibold">Select All Students</Label>
        </div>
        <div className="max-h-80 overflow-y-auto">
            {students.map((student) => (
                <div key={student.id} className="flex items-center justify-between p-4 border-b last:border-b-0">
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id={student.id}
                            checked={selectedStudents.includes(student.id)}
                            onCheckedChange={(checked) => handleSelectStudent(student.id, !!checked)}
                        />
                        <Label htmlFor={student.id} className="cursor-pointer">
                            {student.name} ({student.email})
                        </Label>
                    </div>
                    <span className="text-sm text-gray-500">Total Points: {student.totalPoints}</span>
                </div>
            ))}
        </div>
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Saving...' : 'Save Assignments'}
      </Button>
    </form>
  );
}