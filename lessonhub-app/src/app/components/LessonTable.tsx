// file: src/app/components/LessonTable.tsx

'use client';

import { useState, useMemo } from 'react';
import { Lesson, User } from '@prisma/client';
import { reassignLesson } from '@/actions/adminActions';
import { Input } from '@/components/ui/input';

type LessonWithTeacher = Lesson & {
  teacher: User;
};

interface LessonTableProps {
  lessons: LessonWithTeacher[];
  teachers: User[];
  searchTerm: string;
}

export default function LessonTable({ lessons, teachers, searchTerm: initialSearchTerm }: LessonTableProps) {
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);

  const filteredLessons = useMemo(() => {
    return lessons.filter(lesson =>
      lesson.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [lessons, searchTerm]);

  const handleReassign = async (lessonId: string, newTeacherId: string) => {
    setError(null);
    const result = await reassignLesson(lessonId, newTeacherId);
    if (!result.success) {
      setError(result.error || 'An unknown error occurred.');
    }
  };

  return (
    <div>
      <Input
        type="search"
        placeholder="Search lessons..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-4"
      />
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lesson</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Teacher</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reassign To</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredLessons.map((lesson) => (
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
    </div>
  );
}