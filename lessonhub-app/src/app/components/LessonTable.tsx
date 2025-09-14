// file: src/app/components/LessonTable.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Lesson, User, Assignment } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { reassignLesson } from '@/actions/adminActions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// ✅ CORRECTED TYPE: The 'teacher' property is now correctly marked as optional (User | null)
export type LessonWithTeacher = Lesson & {
  teacher: User | null;
  assignments: Assignment[];
};

interface LessonTableProps {
  lessons: LessonWithTeacher[];
  teachers: User[];
  searchTerm: string;
}

export default function LessonTable({ lessons, teachers, searchTerm }: LessonTableProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReassign = async (lessonId: string, newTeacherId: string | null) => {
    setIsSubmitting(true);
    await reassignLesson(lessonId, newTeacherId);
    setIsSubmitting(false);
  };

  const filteredLessons = lessons.filter(lesson =>
    lesson.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lesson.teacher?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Teacher</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"># Students Assigned</th>
            <th scope="col" className="relative px-6 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {filteredLessons.map((lesson) => (
            <tr key={lesson.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{lesson.title}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{lesson.type}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {/* ✅ CORRECTED RENDERING: Safely access teacher's name or display 'N/A' */}
                {lesson.teacher?.name || <span className="text-gray-400 italic">N/A</span>}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{lesson.assignments.length}</td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" disabled={isSubmitting}>Actions</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>
                      <Link href={`/dashboard/edit/${lesson.id}`}>Edit</Link>
                    </DropdownMenuItem>
                    {teachers.map(teacher => (
                      <DropdownMenuItem key={teacher.id} onSelect={() => handleReassign(lesson.id, teacher.id)} disabled={isSubmitting}>
                        Assign to {teacher.name}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuItem onSelect={() => handleReassign(lesson.id, null)} disabled={isSubmitting}>
                        Unassign Teacher
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}