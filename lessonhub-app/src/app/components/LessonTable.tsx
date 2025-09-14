// file: src/app/components/LessonTable.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
// ✅ FIX: No longer need to import the base `Lesson` type, which avoids the conflict.
import { User, Assignment, LessonType } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { reassignLesson } from '@/actions/adminActions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import LessonPriceEditor from './LessonPriceEditor';

// ✅ FIX: Define a clean, simple type that exactly matches the serializable data
// being passed from the Server Component. This resolves the type error.
export type SerializableLesson = {
  id: string;
  title: string;
  type: LessonType;
  price: number; // This is now a simple number
  teacher: User | null;
  assignments: Assignment[];
};

interface LessonTableProps {
  lessons: SerializableLesson[]; // Use the new clean type
  teachers: User[];
  searchTerm: string;
}

export default function LessonTable({
  lessons,
  teachers,
  searchTerm,
}: LessonTableProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReassign = async (
    lessonId: string,
    newTeacherId: string | null
  ) => {
    setIsSubmitting(true);
    await reassignLesson(lessonId, newTeacherId);
    setIsSubmitting(false);
  };

  const filteredLessons = lessons.filter(
    (lesson) =>
      lesson.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lesson.teacher?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
            >
              Title
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
            >
              Type
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
            >
              Price (€)
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
            >
              Assigned Teacher
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
            >
              # Students Assigned
            </th>
            <th scope="col" className="relative px-6 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {filteredLessons.map((lesson) => (
            <tr key={lesson.id}>
              <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                {lesson.title}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                {lesson.type}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                <LessonPriceEditor
                  lessonId={lesson.id}
                  initialPrice={lesson.price} // No .toNumber() needed
                />
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                {lesson.teacher?.name || (
                  <span className="italic text-gray-400">N/A</span>
                )}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                {lesson.assignments.length}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" disabled={isSubmitting}>
                      Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/edit/${lesson.id}`}>Edit</Link>
                    </DropdownMenuItem>
                    {teachers.map((teacher) => (
                      <DropdownMenuItem
                        key={teacher.id}
                        onSelect={() => handleReassign(lesson.id, teacher.id)}
                        disabled={isSubmitting}
                      >
                        Assign to {teacher.name}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuItem
                      onSelect={() => handleReassign(lesson.id, null)}
                      disabled={isSubmitting}
                    >
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