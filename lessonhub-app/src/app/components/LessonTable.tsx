// file: src/app/components/LessonTable.tsx

'use client';

import { useState } from 'react';
import { Lesson, User } from '@prisma/client';
import { reassignLesson } from '@/actions/adminActions';
import { Button } from '@/components/ui/button';

type LessonWithTeacher = Lesson & {
  teacher: User;
};

interface LessonTableProps {
  lessons: LessonWithTeacher[];
  teachers: User[];
}

export default function LessonTable({ lessons, teachers }: LessonTableProps) {
  const [error, setError] = useState<string | null>(null);

  const handleReassign = async (lessonId: string, newTeacherId: string) => {
    setError(null);
    const result = await reassignLesson(lessonId, newTeacherId);
    if (!result.success) {
      setError(result.error || 'An unknown error occurred.');
    }
  };

  return (
    <div className="overflow-x-auto">
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lesson</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Teacher</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reassign To</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {lessons.map((lesson) => (
            <tr key={lesson.id}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{lesson.title}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{lesson.teacher.name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <select
                  onChange={(e) => handleReassign(lesson.id, e.target.value)}
                  defaultValue={lesson.teacherId}
                  className="border-gray-300 rounded-md shadow-sm"
                >
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}