// file: src/app/components/PlaceholderGuide.tsx
'use client';

import { useEffect } from 'react';

interface PlaceholderGuideProps {
  onClose: () => void;
}

const placeholders = [
  { key: '{{studentName}}', description: "The student's full name." },
  { key: '{{teacherName}}', description: "The teacher's full name." },
  { key: '{{adminName}}', description: "The admin's full name." },
  { key: '{{lessonTitle}}', description: 'The title of the lesson.' },
  { key: '{{deadline}}', description: 'The assignment deadline.' },
  { key: '{{score}}', description: 'The score the student received.' },
  { key: '{{teacherComments}}', description: "The teacher's feedback comments." },
  { key: '{{newUserName}}', description: '(For admin notifications) The new user\'s name.' },
  { key: '{{newUserEmail}}', description: '(For admin notifications) The new user\'s email.' },
  { key: '{{deletedUserName}}', description: '(For admin notifications) The deleted user\'s name.' },
  { key: '{{deletedUserEmail}}', description: '(For admin notifications) The deleted user\'s email.' },
  { key: '{{button}}', description: 'A fully styled, clickable call-to-action button.' },
];

export default function PlaceholderGuide({ onClose }: PlaceholderGuideProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div 
        className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 animate-fade-in"
        onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h2 className="text-2xl font-bold">Email Placeholders Guide</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">&times;</button>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Use these placeholders in your email subject and body. They will be replaced with real data when the email is sent.
        </p>
        <ul className="space-y-3">
          {placeholders.map((p) => (
            <li key={p.key} className="p-3 bg-gray-50 rounded-md">
              <code className="font-mono bg-gray-200 text-gray-800 px-1 py-0.5 rounded">{p.key}</code>
              <p className="text-sm text-gray-700 mt-1">{p.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}