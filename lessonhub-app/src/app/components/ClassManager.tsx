'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { createClass, setStudentClass, shutdownClass } from '@/actions/classActions';

type Student = {
  id: string;
  name: string | null;
  email: string;
  isTakingBreak: boolean;
};

type ClassLink = { student: Student };

type TeacherClass = {
  id: string;
  name: string;
  isActive: boolean;
  students: ClassLink[];
};

interface ClassManagerProps {
  initialClasses: TeacherClass[];
  students: Student[];
}

export default function ClassManager({ initialClasses, students }: ClassManagerProps) {
  const [classes, setClasses] = useState<TeacherClass[]>(initialClasses);
  const [newClassName, setNewClassName] = useState('');

  const studentClassMap = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const cls of classes) {
      for (const link of cls.students) {
        map.set(link.student.id, cls.id);
      }
    }
    return map;
  }, [classes]);

  const handleCreateClass = async () => {
    const name = newClassName.trim();
    if (!name) return;
    const res = await createClass(name);
    if (res.success && res.class) {
      setClasses(prev => [...prev, { id: res.class.id, name: res.class.name, isActive: true, students: [] }]);
      setNewClassName('');
      toast.success('Class created');
    } else {
      toast.error(res.error || 'Failed to create class');
    }
  };

  const handleAssign = async (studentId: string, classId: string | null) => {
    const res = await setStudentClass(studentId, classId);
    if (res.success) {
      // Optimistic update: rebuild classes list
      setClasses(prev => {
        const without = prev.map(c => ({ ...c, students: c.students.filter(l => l.student.id !== studentId) }));
        if (classId) {
          const target = without.find(c => c.id === classId);
          const student = students.find(s => s.id === studentId)!;
          if (target) target.students.push({ student });
        }
        return [...without];
      });
      toast.success('Assignment saved');
    } else {
      toast.error(res.error || 'Failed to assign');
    }
  };

  const handleShutdown = async (classId: string) => {
    if (!confirm('Decommission this class? Students will be unassigned and notified.')) return;
    const res = await shutdownClass(classId);
    if (res.success) {
      setClasses(prev => prev.map(c => (c.id === classId ? { ...c, isActive: false, students: [] } : c)));
      toast.success('Class decommissioned');
    } else {
      toast.error(res.error || 'Failed to decommission');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Students</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {students.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-4 border rounded-md p-3">
                <div>
                  <div className="font-medium">{s.name || s.email}</div>
                  <div className="text-xs text-gray-500">{s.email} {s.isTakingBreak && '• On break'}</div>
                </div>
                <div className="flex items-center gap-2 min-w-[220px]">
                  <select
                    className="w-[220px] h-9 rounded-md border px-3 text-sm"
                    value={studentClassMap.get(s.id) ?? ''}
                    onChange={(e) => handleAssign(s.id, e.target.value || null)}
                  >
                    <option value="">No class</option>
                    {classes.filter(c => c.isActive).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Create Class</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input placeholder="e.g., A1 Morning" value={newClassName} onChange={(e) => setNewClassName(e.target.value)} />
              <Button onClick={handleCreateClass}>Create</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Classes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {classes.map(c => (
                <div key={c.id} className="flex items-center justify-between border rounded-md p-2">
                  <div>
                    <div className="font-medium">{c.name} {!c.isActive && <span className="text-xs text-red-600">(decommissioned)</span>}</div>
                    <div className="text-xs text-gray-500">{c.students.length} student(s)</div>
                  </div>
                  {c.isActive && <Button variant="destructive" size="sm" onClick={() => handleShutdown(c.id)}>Decommission</Button>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
