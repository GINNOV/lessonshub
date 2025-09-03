// file: src/app/components/LessonForm.tsx

'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Lesson } from '@prisma/client';

interface LessonFormProps {
  lesson?: Lesson | null; // Make lesson optional for creating new lessons
}

export default function LessonForm({ lesson }: LessonFormProps) {
  const router = useRouter();
  const inputFileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [lessonPreview, setLessonPreview] = useState('');
  const [assignmentImageUrl, setAssignmentImageUrl] = useState<string | null>(null);
  const [assignmentText, setAssignmentText] = useState('👉🏼 INSTRUCTIONS:\n');
  const [contextText, setContextText] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [visibleAfter, setVisibleAfter] = useState('');

  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkStatus, setLinkStatus] = useState<'idle' | 'testing' | 'valid' | 'invalid'>('idle');

  const isEditMode = !!lesson;

  useEffect(() => {
    if (lesson) {
      setTitle(lesson.title);
      setLessonPreview(lesson.lesson_preview || '');
      setAssignmentText(lesson.assignment_text || '👉🏼 INSTRUCTIONS:\n');
      setContextText(lesson.context_text || '');
      setAssignmentImageUrl(lesson.assignment_image_url || null);
      setAttachmentUrl(lesson.attachment_url || '');
      setNotes(lesson.notes || '');
      setVisibleAfter(lesson.visible_after ? new Date(lesson.visible_after).toISOString().slice(0, 16) : '');
    } else {
      const defaultVisibleAfter = new Date(Date.now() + 30 * 60 * 60 * 1000);
      setVisibleAfter(defaultVisibleAfter.toISOString().slice(0, 16));
    }
  }, [lesson]);
  
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    const file = event.target.files?.[0]; // <-- CORRECTED: Get file directly from the event
    
    if (!file) {
      setError("No file selected or file is invalid."); // Set an error for user feedback
      return;
    }
    
    setIsUploading(true);
    setError(null); // Clear previous errors
    
    try {
      const response = await fetch(`/api/upload?filename=${file.name}`, { method: 'POST', body: file });
      if (!response.ok) throw new Error("Upload failed.");
      const newBlob = await response.json();
      setAssignmentImageUrl(newBlob.url);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleTestLink = async () => {
    setLinkStatus('testing');
    try {
      const response = await fetch('/api/lessons/test-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: attachmentUrl }),
      });
      const data = await response.json();
      setLinkStatus(data.success ? 'valid' : 'invalid');
    } catch (error) {
      setLinkStatus('invalid');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const url = isEditMode ? `/api/lessons/${lesson.id}` : '/api/lessons';
      const method = isEditMode ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, 
          lesson_preview: lessonPreview,
          assignmentText, 
          contextText,
          assignment_image_url: assignmentImageUrl,
          attachment_url: attachmentUrl,
          notes,
          visible_after: visibleAfter ? new Date(visibleAfter) : null,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${isEditMode ? 'update' : 'create'} lesson`);
      }
      
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
      {error && <p className="text-red-500">{error}</p>}
      
      <div className="space-y-2">
        <Label htmlFor="title">Lesson Title</Label>
        <Input type="text" id="title" placeholder="e.g., Introduction to Algebra" value={title} onChange={(e) => setTitle(e.target.value)} required disabled={isLoading} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="lessonPreview">Lesson Preview</Label>
        <Textarea id="lessonPreview" placeholder="A brief preview of the lesson for students." value={lessonPreview} onChange={(e) => setLessonPreview(e.target.value)} disabled={isLoading} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="assignmentImage">Assignment Image (Optional)</Label>
        <Input id="assignmentImage" type="file" ref={inputFileRef} onChange={handleImageUpload} disabled={isLoading || isUploading} />
        {isUploading && <p className="text-sm text-gray-500">Uploading...</p>}
        {assignmentImageUrl && <Image src={assignmentImageUrl} alt="Uploaded preview" width={500} height={300} className="mt-4 w-full h-auto rounded-md border" />}
      </div>

      <div className="space-y-2">
        <Label htmlFor="assignmentText">Instructions</Label>
        <Textarea id="assignmentText" placeholder="Describe the main task for the student." value={assignmentText} onChange={(e) => setAssignmentText(e.target.value)} required disabled={isLoading} className="min-h-[200px]" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="contextText">Additional Information</Label>
        <Textarea id="contextText" placeholder="Add any extra context or instructions here." value={contextText} onChange={(e) => setContextText(e.target.value)} disabled={isLoading} className="min-h-[200px]" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="attachmentUrl">Attachment (Optional)</Label>
        <div className="flex items-center gap-2">
          <Input type="url" id="attachmentUrl" placeholder="https://example.com" value={attachmentUrl} onChange={(e) => setAttachmentUrl(e.target.value)} disabled={isLoading} />
          <Button type="button" variant="outline" onClick={handleTestLink} disabled={!attachmentUrl || isLoading}>
            {linkStatus === 'testing' && 'Testing...'}
            {linkStatus === 'idle' && 'Test Link'}
            {linkStatus === 'valid' && 'Valid'}
            {linkStatus === 'invalid' && 'Invalid'}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Input type="text" id="notes" placeholder="Private notes for this lesson." value={notes} onChange={(e) => setNotes(e.target.value)} disabled={isLoading} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="visibleAfter">Visible to Students After</Label>
        <Input type="datetime-local" id="visibleAfter" value={visibleAfter} onChange={(e) => setVisibleAfter(e.target.value)} disabled={isLoading} />
      </div>
      
      <Button type="submit" disabled={isLoading || isUploading} className="w-full">
        {isLoading ? (isEditMode ? 'Saving...' : 'Creating...') : (isEditMode ? 'Save Changes' : 'Create Lesson')}
      </Button>
    </form>
  );
}