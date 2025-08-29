// file: src/app/components/CreateLessonForm.tsx

'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

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
    if (!inputFileRef.current?.files) {
      throw new Error("No file selected");
    }
    const file = inputFileRef.current.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const response = await fetch(
        `/api/upload?filename=${file.name}`,
        { method: 'POST', body: file },
      );
      if (!response.ok) throw new Error("Upload failed.");

      const newBlob = await response.json();
      setAssignmentImageUrl(newBlob.url);
    } catch (err: any) {
      setError(err.message);
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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-lg space-y-6">
      {error && <p className="text-red-500">{error}</p>}
      
      <div className="space-y-2">
        <Label htmlFor="title">Lesson Title</Label>
        <Input type="text" id="title" placeholder="e.g., Introduction to Algebra" value={title} onChange={(e) => setTitle(e.target.value)} required disabled={isLoading} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="assignmentImage">Assignment Image (Optional)</Label>
        <Input
          id="assignmentImage"
          type="file"
          ref={inputFileRef}
          onChange={handleImageUpload}
          disabled={isLoading || isUploading}
        />
        {isUploading && <p className="text-sm text-gray-500">Uploading...</p>}
        {assignmentImageUrl && <img src={assignmentImageUrl} alt="Uploaded preview" className="mt-4 w-full h-auto rounded-md border" />}
      </div>

      <div className="space-y-2">
        <Label htmlFor="assignmentText">Assignment Description</Label>
        <Textarea id="assignmentText" placeholder="Describe the main task for the student." value={assignmentText} onChange={(e) => setAssignmentText(e.target.value)} required disabled={isLoading} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="contextText">Context / Instructions (Optional)</Label>
        <Textarea id="contextText" placeholder="Add any extra context or instructions here." value={contextText} onChange={(e) => setContextText(e.target.value)} disabled={isLoading} />
      </div>
      
      <Button type="submit" disabled={isLoading || isUploading} className="w-full">
        {isLoading ? 'Saving...' : 'Save Lesson'}
      </Button>
    </form>
  );
}