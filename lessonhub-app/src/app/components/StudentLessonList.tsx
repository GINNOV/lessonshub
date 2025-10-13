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
import { Check } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export type StudentWithStats = Omit<User, 'defaultLessonPrice'> & {
  totalPoints: number;
  defaultLessonPrice: number | null;
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

const getDefaultMidnightDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 0, 0);
    return formatDateTimeForInput(tomorrow);
}

const getDefaultStartDate = () => {
    const today = new Date();
    today.setHours(9, 0, 0, 0); // Today at 9:00 AM
    return formatDateTimeForInput(today);
}

export default function AssignLessonForm({
  lesson,
  students,
  existingAssignments,
}: AssignLessonFormProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [deadlines, setDeadlines] = useState<Record<string, string>>({});
  const [startDates, setStartDates] = useState<Record<string, string>>({});
  const [notificationOption, setNotificationOption] = useState('on_start_date');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // CORRECTED LOGIC: Use lazy initializer to set state correctly on first render.
  const [masterDeadline, setMasterDeadline] = useState<string>(() => 
    existingAssignments.length > 0
      ? formatDateTimeForInput(existingAssignments[0].deadline)
      : getDefaultMidnightDate()
  );
  const [masterStartDate, setMasterStartDate] = useState<string>(() =>
    existingAssignments.length > 0
      ? formatDateTimeForInput(existingAssignments[0].startDate)
      : getDefaultStartDate()
  );
  
  const existingAssignmentsMap = useMemo(() => 
    new Map(existingAssignments.map(a => [a.studentId, a])), 
  [existingAssignments]);

  useEffect(() => {
    if (existingAssignments.length > 0) {
      const initialDeadlines: Record<string, string> = {};
      const initialStartDates: Record<string, string> = {};
      const initialSelected: string[] = [];
      existingAssignments.forEach(a => {
        initialDeadlines[a.studentId] = formatDateTimeForInput(a.deadline);
        initialStartDates[a.studentId] = formatDateTimeForInput(a.startDate);
        initialSelected.push(a.studentId);
      });
      setDeadlines(initialDeadlines);
      setStartDates(initialStartDates);
      setSelectedStudents(initialSelected);
    }
  }, [existingAssignments]);

  useEffect(() => {
    if (notificationOption === 'none') {
        const now = formatDateTimeForInput(new Date());
        setMasterStartDate(now);
        const newStartDates = { ...startDates };
        selectedStudents.forEach(id => {
            newStartDates[id] = now;
        });
        setStartDates(newStartDates);
    }
  }, [notificationOption, selectedStudents, startDates]);


  const filteredStudents = useMemo(() => {
    return students.filter(
      (student) =>
        student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [students, searchTerm]);

  const handleSelectStudent = (studentId: string, isSelected: boolean) => {
    setSelectedStudents((prev) => {
      const newSelected = isSelected ? [...prev, studentId] : prev.filter((id) => id !== studentId);
      if (isSelected) {
        if (masterDeadline && !deadlines[studentId]) {
            setDeadlines(prevDeadlines => ({ ...prevDeadlines, [studentId]: masterDeadline }));
        }
        if (masterStartDate && !startDates[studentId]) {
            setStartDates(prevStartDates => ({ ...prevStartDates, [studentId]: masterStartDate }));
        }
      }
      return newSelected;
    });
  };

  const handleSelectAll = (isSelected: boolean) => {
    const allFilteredIds = filteredStudents.map(s => s.id);
    setSelectedStudents(isSelected ? allFilteredIds : []);
    if (isSelected) {
        const newDeadlines = { ...deadlines };
        const newStartDates = { ...startDates };
        allFilteredIds.forEach(id => {
            if (masterDeadline && !newDeadlines[id]) newDeadlines[id] = masterDeadline;
            if (masterStartDate && !newStartDates[id]) newStartDates[id] = masterStartDate;
        });
        setDeadlines(newDeadlines);
        setStartDates(newStartDates);
    }
  };
  
  const handleMasterDeadlineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDeadline = e.target.value;
    setMasterDeadline(newDeadline);
    const newDeadlines = { ...deadlines };
    selectedStudents.forEach(studentId => {
        newDeadlines[studentId] = newDeadline;
    });
    setDeadlines(newDeadlines);
  };

  const handleMasterStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartDate = e.target.value;
    setMasterStartDate(newStartDate);
    const newStartDates = { ...startDates };
    selectedStudents.forEach(studentId => {
        newStartDates[studentId] = newStartDate;
    });
    setStartDates(newStartDates);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setIsSaved(false);

    const studentsWithoutDates = selectedStudents.filter(id => !deadlines[id] || !startDates[id]);
    if (studentsWithoutDates.length > 0) {
        const studentNames = studentsWithoutDates.map(id => students.find(s => s.id === id)?.name || 'a student').join(', ');
        toast.error(`Please provide a start date and deadline for: ${studentNames}`);
        setIsLoading(false);
        return;
    }

    const initialAssignedStudents = new Set(existingAssignments.map(a => a.studentId));
    
    const studentIdsToUnassign = Array.from(initialAssignedStudents).filter(id => !selectedStudents.includes(id));
    
    const assignmentsToProcess = selectedStudents.map(id => ({
        studentId: id,
        deadline: deadlines[id],
        startDate: startDates[id],
    }));
    
    const assignmentsToUpdate = assignmentsToProcess.filter(a => initialAssignedStudents.has(a.studentId));
    const assignmentsToCreate = assignmentsToProcess.filter(a => !initialAssignedStudents.has(a.studentId));

    try {
      const response = await fetch('/api/assignments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId: lesson.id,
          studentIdsToAssign: assignmentsToCreate,
          studentIdsToUpdate: assignmentsToUpdate,
          studentIdsToUnassign,
          notificationOption,
        }),
      });

      if (!response.ok) throw new Error((await response.json()).error || 'Failed to update assignments.');
      
      const messages = [];
      if (assignmentsToCreate.length > 0) messages.push(`${assignmentsToCreate.length} assigned`);
      if (assignmentsToUpdate.length > 0) messages.push(`${assignmentsToUpdate.length} updated`);
      if (studentIdsToUnassign.length > 0) messages.push(`${studentIdsToUnassign.length} unassigned`);
      
      toast.success(messages.length > 0 ? `Assignments updated: ${messages.join(', ')}.` : 'No changes were made.');
      setIsSaved(true);
      setLastSavedAt(new Date());
      setTimeout(() => setIsSaved(false), 2000);
      
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
            <Label htmlFor="start-date">Set Start Date</Label>
            <Input id="start-date" type="datetime-local" value={masterStartDate} onChange={handleMasterStartDateChange} disabled={notificationOption === 'none'} />
        </div>
        <div className="space-y-2">
            <Label htmlFor="deadline">Set Due Date</Label>
            <Input id="deadline" type="datetime-local" value={masterDeadline} onChange={handleMasterDeadlineChange} />
        </div>
        <div className="space-y-2">
            <Label htmlFor="search">Search Students</Label>
            <Input id="search" type="search" placeholder="Filter by name or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>
      
      <div className="p-4 border rounded-md">
        <Label className="mb-2 block font-semibold">Notification Options</Label>
        <RadioGroup value={notificationOption} onValueChange={setNotificationOption}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="on_start_date" id="on_start_date" />
            <Label htmlFor="on_start_date">Notify students on the start date (default)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="immediate" id="immediate" />
            <Label htmlFor="immediate">Notify newly assigned students immediately</Label>
          </div>
           <div className="flex items-center space-x-2">
            <RadioGroupItem value="none" id="none" />
            <Label htmlFor="none">Don&apos;t notify, make available immediately</Label>
          </div>
        </RadioGroup>
      </div>


      <div className="rounded-lg border overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
                <tr>
                    <th className="px-4 py-3 text-left"><Checkbox id="select-all" checked={areAllFilteredSelected} onCheckedChange={(checked) => handleSelectAll(!!checked)} /></th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.map((student) => (
                    <tr key={student.id}>
                        <td className="px-4 py-4"><Checkbox id={student.id} checked={selectedStudents.includes(student.id)} onCheckedChange={(checked) => handleSelectStudent(student.id, !!checked)} /></td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap"><Input type="datetime-local" value={startDates[student.id] || ''} onChange={(e) => setStartDates(prev => ({ ...prev, [student.id]: e.target.value }))} className="text-sm" disabled={notificationOption === 'none'} /></td>
                        <td className="px-6 py-4 whitespace-nowrap"><Input type="datetime-local" value={deadlines[student.id] || ''} onChange={(e) => setDeadlines(prev => ({ ...prev, [student.id]: e.target.value }))} className="text-sm" /></td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-4">
        <Button type="submit" disabled={isLoading} className="flex-grow">
          {isLoading ? 'Saving...' : (isSaved ? <Check className="h-4 w-4 text-white" /> : 'Save Assignments')}
        </Button>
        {lastSavedAt && (
          <p className="text-sm text-muted-foreground whitespace-nowrap">
            Last saved: {lastSavedAt.toLocaleTimeString()}
          </p>
        )}
      </div>
    </form>
  );
}