// file: src/app/components/StudentLessonList.tsx

'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Assignment, Lesson, User } from '@prisma/client';
import { cn, getWeekAndDay } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type AssignmentWithDetails = Assignment & {
  lesson: Lesson & {
    teacher: User;
  };
};

interface StudentLessonListProps {
  assignments: AssignmentWithDetails[];
}

export default function StudentLessonList({ assignments }: StudentLessonListProps) {
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  const openModal = (imageUrl: string) => setSelectedImageUrl(imageUrl);
  const closeModal = () => setSelectedImageUrl(null);

  return (
    <>
      <div className="space-y-4">
        {assignments.length > 0 ? (
          assignments.map((assignment, index) => (
            <div 
              key={assignment.id} 
              className={cn(
                "p-4 sm:p-6 border rounded-lg shadow-sm",
                index % 2 === 0 ? 'bg-white' : 'bg-slate-50'
              )}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-sm font-bold text-gray-600 uppercase">
                    Lesson #{getWeekAndDay(new Date(assignment.assignedAt))}
                  </span>
                  <div className="mt-1 sm:hidden">
                    <span 
                      className={`px-3 py-1 text-xs font-medium rounded-full
                        ${assignment.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : ''}
                        ${assignment.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' : ''}
                        ${assignment.status === 'GRADED' ? 'bg-green-100 text-green-800' : ''}
                      `}
                    >
                      {assignment.status}
                    </span>
                  </div>
                </div>
                {assignment.status === 'PENDING' && (
                  <Button asChild size="sm" className="sm:size-auto">
                    <Link href={`/assignments/${assignment.id}`}>
                      {/* This span is the key to preventing the React error */}
                      <span>Start Lesson</span>
                    </Link>
                  </Button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-6">
                {assignment.lesson.assignment_image_url && (
                  <div className="flex-shrink-0 w-full sm:w-auto">
                    <Image
                      src={assignment.lesson.assignment_image_url}
                      alt={`Image for ${assignment.lesson.title}`}
                      width={150}
                      height={100}
                      className="rounded-md object-cover w-full h-auto sm:w-[150px] sm:h-[100px] cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => openModal(assignment.lesson.assignment_image_url!)}
                    />
                  </div>
                )}
                <div className="flex-grow">
                  <div className="flex items-center gap-4">
                    <h2 className="text-xl font-semibold">🧀 {assignment.lesson.title}</h2>
                    <span 
                      className={`hidden sm:inline-flex px-3 py-1 text-xs font-medium rounded-full
                        ${assignment.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : ''}
                        ${assignment.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' : ''}
                        ${assignment.status === 'GRADED' ? 'bg-green-100 text-green-800' : ''}
                      `}
                    >
                      {assignment.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Assigned by: {assignment.lesson.teacher.name}
                  </p>
                  
                  {assignment.status === 'GRADED' && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-md">
                      <h3 className="font-semibold">Grade and Feedback</h3>
                      <p className="text-2xl font-bold mt-2">Score: {assignment.score}</p>
                      {assignment.teacherComments && (
                        <blockquote className="mt-2 pl-4 border-l-4 border-gray-300 italic">
                          &quot;{assignment.teacherComments}&quot;
                        </blockquote>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 border-t pt-4">
                  <p className="text-sm text-right text-gray-500">
                    <strong className="text-red-600">Deadline:</strong> {new Date(assignment.deadline).toLocaleString()}
                  </p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 px-6 bg-white border rounded-lg">
            <h3 className="text-lg font-semibold">No Lessons Yet</h3>
            <p className="text-gray-600 mt-1">You haven&apos;t been assigned any lessons yet. Check back later!</p>
          </div>
        )}
      </div>

      {/* --- Image Modal --- */}
      {selectedImageUrl && (
        <div 
          className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4"
          onClick={closeModal}
        >
          <div 
            className="relative max-w-4xl max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={selectedImageUrl}
              alt="Enlarged lesson image"
              width={1200}
              height={800}
              className="rounded-lg object-contain"
              style={{ width: 'auto', height: 'auto', maxHeight: '80vh', maxWidth: '90vw' }}
            />
            <button 
              onClick={closeModal}
              className="absolute top-2 right-2 bg-white rounded-full p-1 text-black"
              aria-label="Close image viewer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}