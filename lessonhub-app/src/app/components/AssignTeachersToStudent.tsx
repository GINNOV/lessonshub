'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { assignTeachersToStudent } from '@/actions/adminActions';

type Teacher = {
  id: string;
  name: string | null;
  email: string;
};

interface AssignTeachersToStudentProps {
  studentId: string;
  allTeachers: Teacher[];
  assignedTeacherIds: string[];
}

export default function AssignTeachersToStudent({ studentId, allTeachers, assignedTeacherIds }: AssignTeachersToStudentProps) {
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>(assignedTeacherIds);
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectTeacher = (teacherId: string, isSelected: boolean) => {
    setSelectedTeachers(prev => isSelected ? [...prev, teacherId] : prev.filter(id => id !== teacherId));
  };

  const handleSelectAll = (isSelected: boolean) => {
    setSelectedTeachers(isSelected ? allTeachers.map(t => t.id) : []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const result = await assignTeachersToStudent(studentId, selectedTeachers);
    if (result.success) {
      toast.success('Teacher assignments updated successfully!');
    } else {
      toast.error(result.error || 'Failed to update teacher assignments.');
    }
    setIsLoading(false);
  };

  const areAllSelected = allTeachers.length > 0 && selectedTeachers.length === allTeachers.length;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border">
        <div className="flex items-center p-4 border-b">
          <Checkbox id="select-all-teachers" checked={areAllSelected} onCheckedChange={(checked) => handleSelectAll(!!checked)} className="mr-2" />
          <Label htmlFor="select-all-teachers" className="font-semibold">Select All Teachers</Label>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {allTeachers.map((teacher) => (
            <div key={teacher.id} className="flex items-center p-4 border-b last:border-b-0">
              <Checkbox id={teacher.id} checked={selectedTeachers.includes(teacher.id)} onCheckedChange={(checked) => handleSelectTeacher(teacher.id, !!checked)} className="mr-2" />
              <Label htmlFor={teacher.id} className="cursor-pointer">{teacher.name || teacher.email} ({teacher.email})</Label>
            </div>
          ))}
        </div>
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">{isLoading ? 'Saving...' : 'Save Teacher Assignments'}</Button>
    </form>
  );
}

