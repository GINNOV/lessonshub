// file: src/app/components/AssignStudentsForm.tsx
'use client';

import { useState } from 'react';
import { User } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { assignStudentsToTeacher } from '@/actions/adminActions';

interface AssignStudentsFormProps {
  teacherId: string;
  allStudents: User[];
  assignedStudentIds: string[];
}

export default function AssignStudentsForm({ teacherId, allStudents, assignedStudentIds }: AssignStudentsFormProps) {
  const [selectedStudents, setSelectedStudents] = useState<string[]>(assignedStudentIds);
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectStudent = (studentId: string, isSelected: boolean) => {
    setSelectedStudents((prev) =>
      isSelected
        ? [...prev, studentId]
        : prev.filter((id) => id !== studentId)
    );
  };

  const handleSelectAll = (isSelected: boolean) => {
    setSelectedStudents(isSelected ? allStudents.map(s => s.id) : []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const result = await assignStudentsToTeacher(teacherId, selectedStudents);

    if (result.success) {
      toast.success('Student assignments updated successfully!');
    } else {
      toast.error(result.error || 'Failed to update assignments.');
    }
    setIsLoading(false);
  };

  const areAllSelected = allStudents.length > 0 && selectedStudents.length === allStudents.length;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
        <div className="max-h-96 overflow-y-auto">
            {allStudents.map((student) => (
                <div key={student.id} className="flex items-center p-4 border-b last:border-b-0">
                    <Checkbox
                        id={student.id}
                        checked={selectedStudents.includes(student.id)}
                        onCheckedChange={(checked) => handleSelectStudent(student.id, !!checked)}
                        className="mr-2"
                    />
                    <Label htmlFor={student.id} className="cursor-pointer">
                        {student.name} ({student.email})
                    </Label>
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
