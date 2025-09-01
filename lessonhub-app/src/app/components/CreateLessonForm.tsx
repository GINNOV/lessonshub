// file: src/app/components/CreateLessonForm.tsx

'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

// A simple, self-contained SVG spinner component for loading feedback.
const Spinner = () => (
  <svg
    className="animate-spin h-5 w-5 text-gray-500"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    ></circle>
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    ></path>
  </svg>
);

export default function CreateLessonForm() {
  const router = useRouter();
  const inputFileRef = useRef<HTMLInputElement>(null);
  
  const [title, setTitle] = useState('');
  const [assignmentImageUrl, setAssignmentImageUrl] = useState<string | null>(null);
  const [assignmentText, setAssignmentText] = useState('');
  const [contextText, setContextText] = useState('');
  
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    setError(null); // Clear previous errors
    
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    try {
      const response = await fetch(`/api/upload?filename=${encodeURIComponent(file.name)}`, { 
        method: 'POST', 
        body: file 
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Image upload failed. Please try again.");
      }
      
      const newBlob = await response.json();
      setAssignmentImageUrl(newBlob.url);

    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setIsUploading(false);
    }
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
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-lg space-y-6">
      {error && <p className="text-red-500 bg-red-100 p-3 rounded-md text-sm">{error}</p>}
      
      <div className="space-y-2">
        <Label htmlFor="title">Lesson Title</Label>
        <Input type="text" id="title" placeholder="e.g., Introduction to Algebra" value={title} onChange={(e) => setTitle(e.target.value)} required disabled={isLoading} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="assignmentImage">Assignment Image (Optional)</Label>
        <div className="flex items-center space-x-4">
          <Input id="assignmentImage" type="file" ref={inputFileRef} onChange={handleImageUpload} disabled={isLoading || isUploading} className="flex-grow"/>
          {isUploading && <Spinner />}
        </div>
        {assignmentImageUrl && (
          <div className="mt-4 border p-2 rounded-md">
            <Image src={assignmentImageUrl} alt="Uploaded preview" width={500} height={300} className="w-full h-auto rounded-md" />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="assignmentText">Assignment Description</Label>
        <Textarea id="assignmentText" placeholder="Describe the main task for the student." value={assignmentText} onChange={(e) => setAssignmentText(e.target.value)} required disabled={isLoading} rows={5} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="contextText">Context / Instructions (Optional)</Label>
        <Textarea id="contextText" placeholder="Add any extra context or instructions here." value={contextText} onChange={(e) => setContextText(e.target.value)} disabled={isLoading} rows={3} />
      </div>
      
      <Button type="submit" disabled={isLoading || isUploading} className="w-full">
        {isLoading ? 'Saving...' : 'Save Lesson'}
      </Button>
    </form>
  );
}
