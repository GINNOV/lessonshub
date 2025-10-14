// file: src/app/components/MultiChoiceCreator.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lesson, MultiChoiceQuestion as PrismaQuestion, MultiChoiceOption as PrismaOption } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import Image from 'next/image';
import ImageBrowser from './ImageBrowser';
import { Info } from 'lucide-react';

type SerializableLesson = Omit<Lesson, 'price'>;

type LessonWithQuestions = SerializableLesson & {
  price: number;
  multiChoiceQuestions: (PrismaQuestion & {
    options: PrismaOption[];
  })[];
};

type TeacherPreferences = {
    defaultLessonPrice?: number | null;
    defaultLessonPreview?: string | null;
    defaultLessonInstructions?: string | null;
    defaultLessonNotes?: string | null;
};

interface MultiChoiceCreatorProps {
  lesson?: LessonWithQuestions | null;
  teacherPreferences?: TeacherPreferences | null;
}

type OptionState = {
    text: string;
    isCorrect: boolean;
};

type QuestionState = {
    question: string;
    options: OptionState[];
};

const OptionalIndicator = () => <Info className="text-gray-400 ml-1 h-4 w-4" />;

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

export default function MultiChoiceCreator({ lesson, teacherPreferences }: MultiChoiceCreatorProps) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState(teacherPreferences?.defaultLessonPrice?.toString() || '0');
  const [lessonPreview, setLessonPreview] = useState(teacherPreferences?.defaultLessonPreview || '');
  const [assignmentText, setAssignmentText] = useState(teacherPreferences?.defaultLessonInstructions || '');
  const [assignmentImageUrl, setAssignmentImageUrl] = useState<string | null>(null);
  const [soundcloudUrl, setSoundcloudUrl] = useState('');
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [feedTracks, setFeedTracks] = useState<{ title: string; link: string }[]>([]);
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [recentUrls, setRecentUrls] = useState<string[]>([]);
  const [linkStatus, setLinkStatus] = useState<'idle' | 'testing' | 'valid' | 'invalid'>('idle');
  const [notes, setNotes] = useState(teacherPreferences?.defaultLessonNotes || '');
  const [questions, setQuestions] = useState<QuestionState[]>([{ question: '', options: [{ text: '', isCorrect: true }, { text: '', isCorrect: false }] }]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const isEditMode = !!lesson;
  const isYouTube = (url: string) => {
    try { const u = new URL(url); return /youtu\.be|youtube\.com/i.test(u.hostname); } catch { return false; }
  };
  const isSoundCloud = (url: string) => {
    try { const u = new URL(url); return /soundcloud\.com/i.test(u.hostname); } catch { return false; }
  };
  const getProviderHint = () => {
    if (!soundcloudUrl) return '';
    try {
      const u = new URL(soundcloudUrl);
      if (/youtu\.be|youtube\.com/i.test(u.hostname)) return 'Detected: YouTube';
      if (/soundcloud\.com/i.test(u.hostname)) return 'Detected: SoundCloud';
      return 'Unknown provider';
    } catch {
      return '';
    }
  };

  useEffect(() => {
    if (lesson) {
      setTitle(lesson.title);
      setPrice(lesson.price.toString());
      setLessonPreview(lesson.lesson_preview || '');
      setAssignmentText(lesson.assignment_text || '');
      setAssignmentImageUrl(lesson.assignment_image_url || null);
      setSoundcloudUrl(lesson.soundcloud_url || '');
      setAttachmentUrl(lesson.attachment_url || '');
      setNotes(lesson.notes || '');
      if (lesson.multiChoiceQuestions && lesson.multiChoiceQuestions.length > 0) {
        setQuestions(lesson.multiChoiceQuestions.map(q => ({
          question: q.question,
          options: q.options.map(o => ({ text: o.text, isCorrect: o.isCorrect }))
        })));
      }
    }
     try {
      const savedUrls = localStorage.getItem('recentAttachmentUrls');
      if (savedUrls) {
        setRecentUrls(JSON.parse(savedUrls));
      }
    } catch (e) {
      console.error("Failed to parse recent URLs from localStorage", e);
    }
  }, [lesson]);

  const loadSoundCloudFeed = async () => {
    setFeedLoading(true);
    setFeedError(null);
    try {
      const defaultFeed = 'https://feeds.soundcloud.com/users/soundcloud:users:1601932527/sounds.rss';
      const res = await fetch(`/api/soundcloud/feed?url=${encodeURIComponent(defaultFeed)}`);
      if (!res.ok) throw new Error('Failed to load SoundCloud feed');
      const data = await res.json();
      const items = Array.isArray(data.items) ? data.items : [];
      setFeedTracks(items);
    } catch (e: any) {
      setFeedError(e.message || 'Unable to load feed');
    } finally {
      setFeedLoading(false);
    }
  };

  
  const handleAssignmentImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
        const response = await fetch(`/api/upload?filename=${file.name}`, { method: 'POST', body: file });
        if (!response.ok) throw new Error("Upload failed.");
        const newBlob = await response.json();
        setAssignmentImageUrl(newBlob.url);
    } catch (err) {
        toast.error((err as Error).message);
    } finally {
        setIsUploading(false);
    }
  };
  
  const addUrlToRecents = (url: string) => {
    if (!url) return;
    try {
      const updatedUrls = [url, ...recentUrls.filter(u => u !== url)].slice(0, 3);
      setRecentUrls(updatedUrls);
      localStorage.setItem('recentAttachmentUrls', JSON.stringify(updatedUrls));
    } catch (e) {
      console.error("Failed to save recent URLs to localStorage", e);
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
      if (data?.success) {
        addUrlToRecents(attachmentUrl);
      }
    } catch (error) {
      setLinkStatus('invalid');
    }
  };

  const handleQuestionChange = (qIndex: number, value: string) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].question = value;
    setQuestions(newQuestions);
  };

  const handleOptionChange = (qIndex: number, oIndex: number, value: string) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options[oIndex].text = value;
    setQuestions(newQuestions);
  };

  const handleCorrectChange = (qIndex: number, oIndex: number) => {
    const newQuestions = [...questions];
    // Set all other options for this question to false
    newQuestions[qIndex].options.forEach((opt, idx) => {
        opt.isCorrect = idx === oIndex;
    });
    setQuestions(newQuestions);
  };

  const addOption = (qIndex: number) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options.push({ text: '', isCorrect: false });
    setQuestions(newQuestions);
  };

  const removeOption = (qIndex: number, oIndex: number) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options = newQuestions[qIndex].options.filter((_, i) => i !== oIndex);
    // Ensure at least one option is marked as correct
    if (!newQuestions[qIndex].options.some(opt => opt.isCorrect)) {
        newQuestions[qIndex].options[0].isCorrect = true;
    }
    setQuestions(newQuestions);
  };

  const addQuestion = () => {
    setQuestions([...questions, { question: '', options: [{ text: '', isCorrect: true }, { text: '', isCorrect: false }] }]);
  };

  const removeQuestion = (qIndex: number) => {
    const newQuestions = questions.filter((_, i) => i !== qIndex);
    setQuestions(newQuestions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const url = isEditMode ? `/api/lessons/multi-choice/${lesson.id}` : '/api/lessons/multi-choice';
    const method = isEditMode ? 'PATCH' : 'POST';

    try {
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                title, 
                price: parseFloat(price) || 0,
                lesson_preview: lessonPreview, 
                assignment_text: assignmentText, 
                assignment_image_url: assignmentImageUrl,
                soundcloud_url: soundcloudUrl,
                attachment_url: attachmentUrl, 
                notes,
                questions 
            }),
        });
        if (!response.ok) throw new Error('Failed to save lesson');
        toast.success('Lesson saved successfully!');
        router.push('/dashboard');
        router.refresh();
    } catch (error) {
        toast.error((error as Error).message);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
       <div className="space-y-2">
        <Label htmlFor="title">Lesson Title</Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., English Prepositions Quiz" />
      </div>

       <div className="space-y-2">
          <Label htmlFor="price">Price (€)</Label>
          <Input id="price" type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} disabled={isLoading} />
      </div>

       <div className="space-y-2">
        <Label htmlFor="lessonPreview">Lesson Preview</Label>
        <Textarea id="lessonPreview" placeholder="A brief preview of the lesson for students." value={lessonPreview} onChange={(e) => setLessonPreview(e.target.value)} />
      </div>

       <div className="space-y-2">
        <Label htmlFor="assignmentText">Instructions</Label>
        <Textarea id="assignmentText" placeholder="Describe the main task for the student." value={assignmentText} onChange={(e) => setAssignmentText(e.target.value)} />
      </div>

       <div className="space-y-2">
        <div className="flex items-center">
            <Label htmlFor="assignmentImage">Assignment Image</Label>
            <OptionalIndicator />
        </div>
        <div className="flex items-center gap-2">
            <Input id="assignmentImage" type="file" onChange={handleAssignmentImageUpload} disabled={isLoading || isUploading} className="flex-grow"/>
            <ImageBrowser onSelectImage={setAssignmentImageUrl} />
        </div>
        {isUploading && <p className="text-sm text-gray-500">Uploading...</p>}
        {assignmentImageUrl && <Image src={assignmentImageUrl} alt="Uploaded preview" width={500} height={300} className="mt-4 w-full h-auto rounded-md border" />}
      </div>
      
       <div className="space-y-2">
        <div className="flex items-center gap-2">
            <Label htmlFor="soundcloudUrl">Audio Material</Label>
            <OptionalIndicator />
            <Button type="button" variant="outline" size="sm" onClick={loadSoundCloudFeed} disabled={feedLoading}>
              {feedLoading ? 'Loading…' : 'Load SoundCloud feed'}
            </Button>
        </div>
        <Input type="url" id="soundcloudUrl" placeholder="https://soundcloud.com/..." value={soundcloudUrl} onChange={(e) => setSoundcloudUrl(e.target.value)} />
        {soundcloudUrl && (
          <p className="text-xs text-gray-500">{getProviderHint()}</p>
        )}
        {!!soundcloudUrl && !isYouTube(soundcloudUrl) && !isSoundCloud(soundcloudUrl) && (
          <p className="text-xs text-red-600 mt-1">Unsupported audio URL. Please use YouTube or SoundCloud.</p>
        )}
        {soundcloudUrl && (
          <p className="text-xs text-gray-500">{getProviderHint()}</p>
        )}
        {feedError && <p className="text-sm text-red-600">{feedError}</p>}
        {feedTracks.length > 0 && (
          <div className="flex items-center gap-2">
            <Label htmlFor="soundcloudFeedSelect" className="text-sm">Select from feed</Label>
            <select
              id="soundcloudFeedSelect"
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
              onChange={(e) => setSoundcloudUrl(e.target.value)}
              value={feedTracks.find(t => t.link === soundcloudUrl) ? soundcloudUrl : ''}
            >
              <option value="">— Choose a track —</option>
              {feedTracks.map((t) => (
                <option key={t.link} value={t.link}>{t.title}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      
       <div className="space-y-2">
        <div className="flex items-center">
            <Label htmlFor="attachmentUrl">Reading Material</Label>
            <OptionalIndicator />
        </div>
        <div className="flex items-center gap-2">
          <Input type="url" id="attachmentUrl" placeholder="https://example.com" value={attachmentUrl} onChange={(e) => setAttachmentUrl(e.target.value)} />
           <Button type="button" variant="outline" onClick={handleTestLink} disabled={!attachmentUrl || isLoading}>
            {linkStatus === 'testing' && 'Testing...'}
            {linkStatus === 'idle' && 'Test Link'}
            {linkStatus === 'valid' && 'Valid'}
            {linkStatus === 'invalid' && 'Invalid'}
          </Button>
        </div>
        {recentUrls.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-500">
            Recent:
            {recentUrls.map(url => (
              <button key={url} type="button" className="underline" onClick={() => setAttachmentUrl(url)}>{new URL(url).hostname}</button>
            ))}
          </div>
        )}
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center">
            <Label htmlFor="notes">Notes for student</Label>
            <OptionalIndicator />
        </div>
        <Textarea id="notes" placeholder="These notes will be visible to students on the assignment page." value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
      </div>
      
      {questions.map((q, qIndex) => (
        <div key={qIndex} className="p-4 border rounded-md space-y-4">
          <div className="flex justify-between items-center">
            <Label>Question {qIndex + 1}</Label>
            <Button type="button" variant="destructive" size="sm" onClick={() => removeQuestion(qIndex)}>Remove Question</Button>
          </div>
          <Textarea value={q.question} onChange={(e) => handleQuestionChange(qIndex, e.target.value)} placeholder={`Enter question ${qIndex + 1}`} />
          {q.options.map((opt, oIndex) => (
            <div key={oIndex} className="flex items-center gap-2">
              <Checkbox checked={opt.isCorrect} onCheckedChange={() => handleCorrectChange(qIndex, oIndex)} />
              <Input value={opt.text} onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)} placeholder={`Option ${oIndex + 1}`} />
              <Button type="button" variant="outline" size="sm" onClick={() => removeOption(qIndex, oIndex)} disabled={q.options.length <= 2}>-</Button>
            </div>
          ))}
          <Button type="button" variant="secondary" size="sm" onClick={() => addOption(qIndex)}>Add Option</Button>
        </div>
      ))}
      <div className="flex justify-between">
        <Button type="button" onClick={addQuestion}>Add Question</Button>
        <Button type="submit" disabled={isLoading}>{isLoading ? 'Saving...' : 'Save Lesson'}</Button>
      </div>
    </form>
  );
}
