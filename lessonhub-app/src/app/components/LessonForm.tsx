// file: src/app/components/LessonForm.tsx

'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Lesson, AssignmentNotification } from '@prisma/client';
import { Info, Paperclip, FileAudio } from 'lucide-react';

interface LessonFormProps {
  lesson?: Lesson | null;
}

// --- START: Robust JSON Parsing Helper ---
async function safeJson(response: Response) {
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  
  try {
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  } catch (error) {
    return null;
  }
}
// --- END: Robust JSON Parsing Helper ---

const RECENT_URLS_KEY = 'recentAttachmentUrls';
const MAX_RECENT_URLS = 5;

export default function LessonForm({ lesson }: LessonFormProps) {
  const router = useRouter();
  const inputFileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [lessonPreview, setLessonPreview] = useState('');
  const [assignmentImageUrl, setAssignmentImageUrl] = useState<string | null>(null);
  const [soundcloudUrl, setSoundcloudUrl] = useState(''); // Task 6
  const [assignmentText, setAssignmentText] = useState('INSTRUCTIONS:\n');
  const [questions, setQuestions] = useState<string[]>(['']);
  const [contextText, setContextText] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [recentAttachmentUrls, setRecentAttachmentUrls] = useState<string[]>([]); // Task 3
  const [notes, setNotes] = useState('');
  const [assignmentNotification, setAssignmentNotification] = useState<AssignmentNotification>(AssignmentNotification.NOT_ASSIGNED);
  const [scheduledDate, setScheduledDate] = useState('');

  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkStatus, setLinkStatus] = useState<'idle' | 'testing' | 'valid' | 'invalid'>('idle');

  const isEditMode = !!lesson;

  // Task 3: Load recent URLs from local storage on component mount
  useEffect(() => {
    try {
      const storedUrls = localStorage.getItem(RECENT_URLS_KEY);
      if (storedUrls) {
        setRecentAttachmentUrls(JSON.parse(storedUrls));
      }
    } catch (e) {
      console.error("Failed to parse recent URLs from localStorage", e);
    }
  }, []);

  useEffect(() => {
    if (lesson) {
      setTitle(lesson.title);
      setLessonPreview(lesson.lesson_preview || '');
      setAssignmentText(lesson.assignment_text || 'INSTRUCTIONS:\n');
      setQuestions((lesson.questions as string[]) || ['']);
      setContextText(lesson.context_text || '');
      setAssignmentImageUrl(lesson.assignment_image_url || null);
      setSoundcloudUrl(lesson.soundcloud_url || ''); // Task 6
      setAttachmentUrl(lesson.attachment_url || '');
      setNotes(lesson.notes || '');
      setAssignmentNotification(lesson.assignment_notification);
      if (lesson.scheduled_assignment_date) {
        const d = new Date(lesson.scheduled_assignment_date);
        const formattedDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        setScheduledDate(formattedDate);
      }
    }
  }, [lesson]);
  
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    const file = event.target.files?.[0];
    
    if (!file) {
      setError("No file selected or file is invalid.");
      return;
    }
    
    setIsUploading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/upload?filename=${file.name}`, { method: 'POST', body: file });
      if (!response.ok) {
        const errorData = await safeJson(response);
        throw new Error(errorData?.error || "Upload failed with status: " + response.status);
      }
      const newBlob = await safeJson(response);
      if (newBlob?.url) {
        setAssignmentImageUrl(newBlob.url);
      } else {
        throw new Error("Failed to get image URL from the server.");
      }
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
      const data = await safeJson(response);
      setLinkStatus(data?.success ? 'valid' : 'invalid');
    } catch (error) {
      setLinkStatus('invalid');
    }
  };

  const handleAddQuestion = () => {
    setQuestions([...questions, '']);
  };

  const handleQuestionChange = (index: number, value: string) => {
    const newQuestions = [...questions];
    newQuestions[index] = value;
    setQuestions(newQuestions);
  };
  
    // Task 3: Update and save recent URLs
  const updateRecentUrls = (url: string) => {
    if (!url) return;
    setRecentAttachmentUrls(prevUrls => {
      const newUrls = [url, ...prevUrls.filter(u => u !== url)].slice(0, MAX_RECENT_URLS);
      try {
        localStorage.setItem(RECENT_URLS_KEY, JSON.stringify(newUrls));
      } catch (e) {
        console.error("Failed to save recent URLs to localStorage", e);
      }
      return newUrls;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Lesson title cannot be empty.');
      return;
    }
    const validQuestions = questions.filter(q => q.trim() !== '');
    if (validQuestions.length === 0) {
      setError('You must include at least one question.');
      return;
    }
    if (assignmentNotification === 'ASSIGN_ON_DATE' && !scheduledDate) {
        setError('Please select a date and time to schedule the assignment.');
        return;
    }

    setIsLoading(true);

    // Task 3: Save the URL on submit
    updateRecentUrls(attachmentUrl);

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
          questions: validQuestions,
          contextText,
          assignment_image_url: assignmentImageUrl,
          soundcloud_url: soundcloudUrl, // Task 6
          attachment_url: attachmentUrl,
          notes,
          assignment_notification: assignmentNotification,
          scheduled_assignment_date: assignmentNotification === 'ASSIGN_ON_DATE' ? new Date(scheduledDate) : null,
        }),
      });
      if (!response.ok) {
        const errorData = await safeJson(response);
        throw new Error(errorData?.error || `Failed to ${isEditMode ? 'update' : 'create'} lesson`);
      }
      
      router.push('/dashboard');
      router.refresh();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Task 6: SoundCloud embed logic
  const getSoundCloudEmbedUrl = (url: string) => {
    if (!url.includes('soundcloud.com')) return null;
    return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true`;
  };
  const soundCloudEmbedUrl = getSoundCloudEmbedUrl(soundcloudUrl);

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-lg space-y-6">
      {error && <p className="text-red-500 bg-red-100 p-3 rounded-md">{error}</p>}
      
      <div className="space-y-2">
        <Label htmlFor="title" className="font-bold">Lesson Title</Label>
        <Input type="text" id="title" placeholder="e.g., Introduction to Algebra" value={title} onChange={(e) => setTitle(e.target.value)} required disabled={isLoading} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="lessonPreview" className="font-bold">Lesson Preview</Label>
        <Textarea id="lessonPreview" placeholder="A brief preview of the lesson for students." value={lessonPreview} onChange={(e) => setLessonPreview(e.target.value)} disabled={isLoading} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="assignmentImage" className="font-bold flex items-center">
          Assignment Image <Info size={14} className="ml-2 text-gray-400" />
        </Label>
        <Input id="assignmentImage" type="file" ref={inputFileRef} onChange={handleImageUpload} disabled={isLoading || isUploading} />
        {isUploading && <p className="text-sm text-gray-500">Uploading...</p>}
        {assignmentImageUrl && <Image src={assignmentImageUrl} alt="Uploaded preview" width={500} height={300} className="mt-4 w-full h-auto rounded-md border" />}
      </div>

       {/* Task 6: SoundCloud Audio Link */}
      <div className="space-y-2">
        <Label htmlFor="soundcloudUrl" className="font-bold flex items-center">
          SoundCloud Audio <FileAudio size={14} className="ml-2 text-gray-400" />
        </Label>
        <Input type="url" id="soundcloudUrl" placeholder="https://soundcloud.com/..." value={soundcloudUrl} onChange={(e) => setSoundcloudUrl(e.target.value)} disabled={isLoading} />
        {soundCloudEmbedUrl && (
          <div className="mt-2">
            <iframe
              width="100%"
              height="166"
              scrolling="no"
              frameBorder="no"
              allow="autoplay"
              src={soundCloudEmbedUrl}
            ></iframe>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {/* Task 2: Bold label */}
        <Label htmlFor="assignmentText" className="font-bold">Instructions</Label> 
        {/* Task 1: Reduced height */}
        <Textarea id="assignmentText" placeholder="Describe the main task for the student." value={assignmentText} onChange={(e) => setAssignmentText(e.target.value)} required disabled={isLoading} className="min-h-[100px]" />
      </div>
      
      <div className="space-y-2">
        {questions.map((question, index) => (
          <div key={index} className="flex items-center gap-2">
            <Label htmlFor={`question-${index}`} className="whitespace-nowrap font-bold">Question {index + 1}</Label>
            <Input type="text" id={`question-${index}`} value={question} onChange={(e) => handleQuestionChange(index, e.target.value)} disabled={isLoading} />
            {index === questions.length - 1 && (
              <Button type="button" onClick={handleAddQuestion} disabled={isLoading}>+</Button>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <Label htmlFor="contextText" className="font-bold">Additional Information</Label>
        {/* Task 1: Reduced height */}
        <Textarea id="contextText" placeholder="Add any extra context or instructions here." value={contextText} onChange={(e) => setContextText(e.target.value)} disabled={isLoading} className="min-h-[100px]" />
      </div>

      <div className="space-y-2">
        {/* Task 4: Replaced text with icon */}
        <Label htmlFor="attachmentUrl" className="font-bold flex items-center">
          Attachment <Paperclip size={14} className="ml-2 text-gray-400" />
        </Label>
        <div className="flex items-center gap-2">
          {/* Task 3: Add datalist for recent URLs */}
          <Input 
            type="url" 
            id="attachmentUrl" 
            list="recent-urls"
            placeholder="https://example.com" 
            value={attachmentUrl} 
            onChange={(e) => setAttachmentUrl(e.target.value)} 
            disabled={isLoading} 
          />
          <datalist id="recent-urls">
            {recentAttachmentUrls.map(url => <option key={url} value={url} />)}
          </datalist>
          <Button type="button" variant="outline" onClick={handleTestLink} disabled={!attachmentUrl || isLoading}>
            {linkStatus === 'testing' && 'Testing...'}
            {linkStatus === 'idle' && 'Test Link'}
            {linkStatus === 'valid' && 'Valid'}
            {linkStatus === 'invalid' && 'Invalid'}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes" className="font-bold flex items-center">
          Notes <Info size={14} className="ml-2 text-gray-400" />
        </Label>
        <Input type="text" id="notes" placeholder="Private notes for this lesson." value={notes} onChange={(e) => setNotes(e.target.value)} disabled={isLoading} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="assignmentNotification" className="font-bold">Assignment Status</Label>
        <select
          id="assignmentNotification"
          value={assignmentNotification}
          onChange={(e) => setAssignmentNotification(e.target.value as AssignmentNotification)}
          disabled={isLoading}
          className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
        >
          {/* Task 9 */}
          <option value={AssignmentNotification.NOT_ASSIGNED}>Save lesson</option>
          {/* Task 8 */}
          <option value={AssignmentNotification.ASSIGN_WITHOUT_NOTIFICATION}>Assign to All Students Now</option>
          <option value={AssignmentNotification.ASSIGN_AND_NOTIFY}>Assign to All and Notify Now</option>
          {/* Task 7 */}
          <option value={AssignmentNotification.ASSIGN_ON_DATE}>Assign to all on date...</option>
        </select>
      </div>

      {assignmentNotification === "ASSIGN_ON_DATE" && (
        <div className="space-y-2 animate-fade-in-up">
          <Label htmlFor="scheduledDate" className="font-bold">Scheduled Assignment Date & Time</Label>
          <Input
            type="datetime-local"
            id="scheduledDate"
            value={scheduledDate}
            onChange={e => setScheduledDate(e.target.value)}
            required
            disabled={isLoading}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
          />
        </div>
      )}
      
      <Button type="submit" disabled={isLoading || isUploading} className="w-full">
        {isLoading ? (isEditMode ? 'Saving...' : 'Creating...') : (isEditMode ? 'Save Changes' : 'Create Lesson')}
      </Button>
    </form>
  );
}

