// file: src/app/components/CreateLessonForm.tsx

'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function CreateLessonForm() {
  const router = useRouter();
  const inputFileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [assignmentImageUrl, setAssignmentImageUrl] = useState<string | null>(null);
  const [assignmentText, setAssignmentText] = useState('');
  const [contextText, setContextText] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    if (!inputFileRef.current?.files) {
      throw new Error("No file selected");
    }
    const file = inputFileRef.current.files[0];

    const response = await fetch(
      `/api/upload?filename=${file.name}`,
      { method: 'POST', body: file },
    );
    const newBlob = await response.json();
    setAssignmentImageUrl(newBlob.url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          assignmentText,
          contextText,
          assignment_image_url: assignmentImageUrl,
        }),
      });
      if (!response.ok) throw new Error("Failed to create lesson");

      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-lg space-y-6">
      {error && <p className="text-red-500">{error}</p>}
      <div>
        <label htmlFor="title" /* ... */>Lesson Title</label>
        <input type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)} required disabled={isLoading} /* ... */ />
      </div>

      <div>
        <label htmlFor="assignmentImage" className="block text-sm font-medium text-gray-700">Assignment Image (Optional)</label>
        <input
          id="assignmentImage"
          name="assignmentImage"
          type="file"
          ref={inputFileRef}
          onChange={handleImageUpload}
          className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          disabled={isLoading}
        />
        {assignmentImageUrl && <img src={assignmentImageUrl} alt="Uploaded preview" className="mt-4 w-full h-auto rounded-md" />}
      </div>

      <div>
        <label htmlFor="assignmentText" /* ... */>Assignment Description</label>
        <textarea id="assignmentText" value={assignmentText} onChange={(e) => setAssignmentText(e.target.value)} required disabled={isLoading} /* ... */></textarea>
      </div>

      <div>
        <label htmlFor="contextText" /* ... */>Context / Instructions (Optional)</label>
        <textarea id="contextText" value={contextText} onChange={(e) => setContextText(e.target.value)} disabled={isLoading} /* ... */></textarea>
      </div>

      <button type="submit" disabled={isLoading} /* ... */>
        {isLoading ? 'Saving...' : 'Save Lesson'}
      </button>
    </form>
  );
}