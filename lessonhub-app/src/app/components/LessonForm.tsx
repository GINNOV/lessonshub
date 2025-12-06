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
import ImageBrowser from './ImageBrowser'; 
import { getWeekAndDay } from '@/lib/utils';
import { Info, Upload } from 'lucide-react';
import { LessonDifficultySelector } from '@/app/components/LessonDifficultySelector';
import ManageInstructionBookletsLink from '@/app/components/ManageInstructionBookletsLink';
import FileUploadButton from '@/components/FileUploadButton';
import { Switch } from '@/components/ui/switch';

type SerializableLesson = Omit<Lesson, 'price'> & {
  price: number;
  isFreeForAll?: boolean;
};

type TeacherPreferences = {
    defaultLessonPrice?: number | null;
    defaultLessonPreview?: string | null;
    defaultLessonNotes?: string | null;
    defaultLessonInstructions?: string | null;
};

interface InstructionBooklet {
  id: string;
  title: string;
  body: string;
}

interface LessonFormProps {
  lesson?: SerializableLesson | null;
  teacherPreferences?: TeacherPreferences | null;
  instructionBooklets?: InstructionBooklet[];
}

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

const OptionalIndicator = () => <Info className="ml-1 h-4 w-4 text-muted-foreground" />;

export default function LessonForm({ lesson, teacherPreferences, instructionBooklets = [] }: LessonFormProps) {
  const router = useRouter();
  const inputFileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [lessonPreview, setLessonPreview] = useState(teacherPreferences?.defaultLessonPreview || '');
  const [price, setPrice] = useState(teacherPreferences?.defaultLessonPrice?.toString() || '0');
  const [assignmentImageUrl, setAssignmentImageUrl] = useState<string | null>(null);
  const [soundcloudUrl, setSoundcloudUrl] = useState('');
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [feedTracks, setFeedTracks] = useState<{ title: string; link: string }[]>([]);
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
  const isYouTube = (url: string) => {
    try { const u = new URL(url); return /youtu\.be|youtube\.com/i.test(u.hostname); } catch { return false; }
  };
  const isSoundCloud = (url: string) => {
    try { const u = new URL(url); return /soundcloud\.com/i.test(u.hostname); } catch { return false; }
  };
  const getYouTubeId = (url: string): string | null => {
    try {
      const u = new URL(url);
      if (u.hostname.includes('youtu.be')) return u.pathname.replace('/', '');
      if (u.searchParams.get('v')) return u.searchParams.get('v');
      const parts = u.pathname.split('/').filter(Boolean);
      if (parts[0] === 'embed' || parts[0] === 'shorts') return parts[1] || null;
      return null;
    } catch { return null; }
  };
  const [assignmentText, setAssignmentText] = useState(teacherPreferences?.defaultLessonInstructions || '👉🏼 INSTRUCTIONS:\n');
  const [questions, setQuestions] = useState<string[]>(['']);
  const [expectedAnswers, setExpectedAnswers] = useState<string[]>(['']);
  const [contextText, setContextText] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [recentUrls, setRecentUrls] = useState<string[]>([]);
  const [notes, setNotes] = useState(teacherPreferences?.defaultLessonNotes || '');
  const [assignmentNotification, setAssignmentNotification] = useState<AssignmentNotification>(AssignmentNotification.NOT_ASSIGNED);
  const [scheduledDate, setScheduledDate] = useState('');
  const [difficulty, setDifficulty] = useState<number>(lesson?.difficulty ?? 3);
  const [selectedBookletId, setSelectedBookletId] = useState('');
  const [isFreeForAll, setIsFreeForAll] = useState<boolean>(lesson?.isFreeForAll ?? false);

  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkStatus, setLinkStatus] = useState<'idle' | 'testing' | 'valid' | 'invalid'>('idle');

  const isEditMode = !!lesson;

  useEffect(() => {
    try {
      const savedUrls = localStorage.getItem('recentAttachmentUrls');
      if (savedUrls) {
        setRecentUrls(JSON.parse(savedUrls));
      }
    } catch (e) {
      console.error("Failed to parse recent URLs from localStorage", e);
    }

    if (lesson) {
      setTitle(lesson.title);
      setLessonPreview(lesson.lesson_preview || '');
      setPrice(lesson.price.toString());
      setAssignmentText(lesson.assignment_text || '👉🏼 INSTRUCTIONS:\n');
      const normalizedQuestions = Array.isArray(lesson.questions)
        ? (lesson.questions as any[]).map((item) => {
            if (typeof item === 'string') return { question: item, expectedAnswer: '' };
            if (item && typeof item === 'object') {
              return {
                question: typeof (item as any).question === 'string' ? (item as any).question : '',
                expectedAnswer: typeof (item as any).expectedAnswer === 'string' ? (item as any).expectedAnswer : '',
              };
            }
            return { question: String(item ?? ''), expectedAnswer: '' };
          })
        : [{ question: '', expectedAnswer: '' }];
      setQuestions(normalizedQuestions.map((q) => q.question || ''));
      setExpectedAnswers(normalizedQuestions.map((q) => q.expectedAnswer || ''));
      setContextText(lesson.context_text || '');
      setAssignmentImageUrl(lesson.assignment_image_url || null);
      setSoundcloudUrl(lesson.soundcloud_url || '');
      setAttachmentUrl(lesson.attachment_url || '');
      setNotes(lesson.notes || '');
      setAssignmentNotification(lesson.assignment_notification);
      if (lesson.scheduled_assignment_date) {
        const d = new Date(lesson.scheduled_assignment_date);
        const formattedDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        setScheduledDate(formattedDate);
      }
      setDifficulty(lesson.difficulty ?? 3);
      setIsFreeForAll(Boolean((lesson as any).isFreeForAll));
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
      if (data?.success) {
        addUrlToRecents(attachmentUrl);
      }
    } catch (error) {
      setLinkStatus('invalid');
    }
  };

  const handleAddQuestion = () => {
    setQuestions([...questions, '']);
    setExpectedAnswers([...expectedAnswers, '']);
  };

  const handleQuestionChange = (index: number, value: string) => {
    const newQuestions = [...questions];
    newQuestions[index] = value;
    setQuestions(newQuestions);
  };

  const handleExpectedChange = (index: number, value: string) => {
    const next = [...expectedAnswers];
    next[index] = value;
    setExpectedAnswers(next);
  };

  const handleRemoveQuestion = (index: number) => {
    const newQuestions = [...questions];
    newQuestions.splice(index, 1);
    const newExpected = [...expectedAnswers];
    newExpected.splice(index, 1);
    setQuestions(newQuestions);
    setExpectedAnswers(newExpected);
  };

  const handleQuestionsCsv = async (file?: File | null) => {
  if (!file) return;
  const text = await file.text();
  const rows = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (rows.length === 0) {
    setError('CSV appears to be empty.');
    return;
  }
  const nextQuestions: string[] = [];
  const nextExpected: string[] = [];
  rows.forEach((row, idx) => {
    const parts = row.split(',').map((part) => part.trim().replace(/^"|"$/g, ''));
    // Skip header row if present
    if (idx === 0 && parts[0]?.toLowerCase() === 'question' && parts[1]?.toLowerCase() === 'answer') {
      return;
    }
    const question = parts[0] || '';
    const expected = parts[1] || '';
    if (!question) return;
    nextQuestions.push(question);
    nextExpected.push(expected);
  });
    if (nextQuestions.length === 0) {
      setError('No questions found in the CSV (expected columns: question, expected answer).');
      return;
    }
    setQuestions(nextQuestions);
    setExpectedAnswers(nextExpected);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Lesson title cannot be empty.');
      return;
    }
    if (!lessonPreview.trim()) {
      setError('Lesson preview cannot be empty.');
      return;
    }
    const normalizedQa = questions
      .map((q, idx) => ({
        question: q.trim(),
        expectedAnswer: (expectedAnswers[idx] || '').trim(),
      }))
      .filter((entry) => entry.question);

    if (normalizedQa.length === 0) {
      setError('You must include at least one question.');
      return;
    }
    if (assignmentNotification === 'ASSIGN_ON_DATE' && !scheduledDate) {
        setError('Please select a date and time to schedule the assignment.');
        return;
    }
    if (!difficulty || difficulty < 1 || difficulty > 5) {
      setError('Please choose a difficulty level for this lesson.');
      return;
    }

    setIsLoading(true);
    try {
      const url = isEditMode && lesson ? `/api/lessons/${lesson.id}` : '/api/lessons';
      const method = isEditMode ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          price: parseFloat(price) || 0,
          lesson_preview: lessonPreview,
          assignmentText, 
          difficulty,
          questions: normalizedQa,
          contextText,
          assignment_image_url: assignmentImageUrl,
          soundcloud_url: soundcloudUrl,
          attachment_url: attachmentUrl,
          notes,
          assignment_notification: assignmentNotification,
          scheduled_assignment_date: assignmentNotification === 'ASSIGN_ON_DATE' ? new Date(scheduledDate) : null,
          isFreeForAll,
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

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-lg space-y-6">
      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-destructive">
          {error}
        </p>
      )}
      
      <div className="form-field">
        <Label htmlFor="title">
            Lesson Title 
            {isEditMode && lesson && (
              <span className="ml-2 font-normal text-muted-foreground">
                ({getWeekAndDay(new Date(lesson.createdAt))})
              </span>
            )}
        </Label>
        <Input type="text" id="title" placeholder="e.g., Introduction to Algebra" value={title} onChange={(e) => setTitle(e.target.value)} required disabled={isLoading} />
      </div>

      <div className="form-field">
        <Label htmlFor="lessonPreview">Lesson Preview</Label>
        <Textarea id="lessonPreview" placeholder="A brief preview of the lesson for students." value={lessonPreview} onChange={(e) => setLessonPreview(e.target.value)} required disabled={isLoading} />
      </div>

      <div className="form-field">
        <Label htmlFor="price">Price (€)</Label>
        <Input id="price" type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} disabled={isLoading} />
      </div>
      <div className="flex items-start justify-between rounded-lg border bg-card/60 p-4">
        <div>
          <p className="text-sm font-semibold">Make this lesson free for everyone</p>
          <p className="text-xs text-muted-foreground">
            When enabled, all students can access this lesson even without a paid plan.
          </p>
        </div>
        <Switch checked={isFreeForAll} onCheckedChange={setIsFreeForAll} />
      </div>

      <LessonDifficultySelector value={difficulty} onChange={setDifficulty} disabled={isLoading} />

      <div className="form-field">
        <div className="flex items-center">
            <Label htmlFor="assignmentImage">Assignment Image</Label>
            <OptionalIndicator />
        </div>
        <div className="flex items-center gap-2">
            <FileUploadButton
              id="assignmentImage"
              ref={inputFileRef}
              onChange={handleImageUpload}
              disabled={isLoading || isUploading}
              accept="image/*"
              className="flex-grow"
            />
            <ImageBrowser onSelectImage={setAssignmentImageUrl} />
        </div>
        {isUploading && <p className="text-sm text-muted-foreground">Uploading...</p>}
        {assignmentImageUrl && <Image src={assignmentImageUrl} alt="Uploaded preview" width={500} height={300} className="mt-4 w-full h-auto rounded-md border" />}
      </div>
      
      <div className="form-field">
        <div className="flex items-center gap-2">
          <div className="flex items-center">
            <Label htmlFor="soundcloudUrl">Audio material</Label>
            <OptionalIndicator />
          </div>
          <Button type="button" variant="outline" size="sm" onClick={loadSoundCloudFeed} disabled={feedLoading}>
            {feedLoading ? 'Loading…' : 'Load SoundCloud feed'}
          </Button>
        </div>
        <Input
          type="url"
          id="soundcloudUrl"
          placeholder="https://soundcloud.com/..."
          value={soundcloudUrl}
          onChange={(e) => setSoundcloudUrl(e.target.value)}
          disabled={isLoading}
        />
        {soundcloudUrl && (
          <p className="text-xs text-muted-foreground">{getProviderHint()}</p>
        )}
        {feedError && <p className="text-sm text-destructive">{feedError}</p>}
        {feedTracks.length > 0 && (
          <div className="flex items-center gap-2">
            <Label htmlFor="soundcloudFeedSelect" className="text-sm">Select from feed</Label>
            <select
              id="soundcloudFeedSelect"
              className="w-full rounded-md border border-border bg-card/70 p-2 text-foreground shadow-sm"
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
        {!!soundcloudUrl && !isYouTube(soundcloudUrl) && !isSoundCloud(soundcloudUrl) && (
          <p className="mt-1 text-xs text-destructive">Unsupported audio URL. Please use YouTube or SoundCloud.</p>
        )}
        {(isYouTube(soundcloudUrl) && getYouTubeId(soundcloudUrl)) && (
          <div className="mt-3 aspect-video w-full overflow-hidden rounded-md border">
            <iframe
              title="YouTube preview"
              className="h-full w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              frameBorder="0"
              src={`https://www.youtube.com/embed/${getYouTubeId(soundcloudUrl)}?rel=0`}
            />
          </div>
        )}
        {isSoundCloud(soundcloudUrl) && (
          <div className="mt-3 w-full overflow-hidden rounded-md border">
            <iframe
              title="SoundCloud preview"
              width="100%"
              height="120"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              scrolling="no"
              frameBorder="0"
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(soundcloudUrl)}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=false`}
            />
          </div>
        )}
      </div>

      <div className="form-field">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <Label htmlFor="assignmentText" className="text-base font-semibold">Instructions</Label>
          {instructionBooklets.length > 0 && (
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <select
                value={selectedBookletId}
                onChange={(e) => setSelectedBookletId(e.target.value)}
                className="rounded-md border border-border bg-card/70 p-2 text-sm text-foreground shadow-sm"
              >
                <option value="">Insert from booklet…</option>
                {instructionBooklets.map((booklet) => (
                  <option key={booklet.id} value={booklet.id}>
                    {booklet.title}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!selectedBookletId}
                  onClick={() => {
                    const booklet = instructionBooklets.find((b) => b.id === selectedBookletId);
                    if (booklet) {
                      setAssignmentText(booklet.body);
                    }
                  }}
                >
                  Replace
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!selectedBookletId}
                  onClick={() => {
                    const booklet = instructionBooklets.find((b) => b.id === selectedBookletId);
                    if (booklet) {
                      setAssignmentText((prev) => `${prev.trim()}\n\n${booklet.body}`.trim());
                    }
                  }}
                >
                  Append
                </Button>
              </div>
            </div>
          )}
        </div>
        <Textarea id="assignmentText" placeholder="Describe the main task for the student." value={assignmentText} onChange={(e) => setAssignmentText(e.target.value)} required disabled={isLoading} className="min-h-[100px]" />
        <p className="text-xs text-muted-foreground">
          Need reusable sets?{' '}
          <ManageInstructionBookletsLink />
        </p>
      </div>
      
      <div className="form-field space-y-3">
        <div className="flex items-center justify-between">
          <Label>Questions</Label>
          <Button type="button" size="sm" variant="outline" onClick={handleAddQuestion} disabled={isLoading}>
            Add Question
          </Button>
        </div>
        <div className="rounded-lg border border-border bg-card/50 p-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Label htmlFor="questionsCsv" className="text-sm">Import CSV (question, expected answer)</Label>
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={isLoading}
              className="w-10 h-10"
              onClick={() => document.getElementById('questionsCsv')?.click()}
              title="Import questions from CSV"
            >
              <Upload className="h-4 w-4" />
            </Button>
            <input
              id="questionsCsv"
              type="file"
              accept=".csv,text/csv"
              disabled={isLoading}
              onChange={(e) => handleQuestionsCsv(e.target.files?.[0] ?? null)}
              className="hidden"
            />
          </div>
            {questions.map((question, index) => (
            <div key={index} className="space-y-2 rounded-md border border-border bg-card/80 p-3 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-muted-foreground">Question {index + 1}</span>
                <div className="flex gap-1">
                  <Button type="button" size="icon" onClick={handleAddQuestion} disabled={isLoading}>+</Button>
                  <Button type="button" size="icon" onClick={() => handleRemoveQuestion(index)} disabled={isLoading || questions.length <= 1} variant="destructive">-</Button>
                </div>
              </div>
              <Input
                type="text"
                id={`question-${index}`}
                placeholder={`Question ${index + 1}`}
                value={question}
                onChange={(e) => handleQuestionChange(index, e.target.value)}
                disabled={isLoading}
              />
              <Input
                type="text"
                placeholder="Expected answer (shown after grading)"
                value={expectedAnswers[index] || ''}
                onChange={(e) => handleExpectedChange(index, e.target.value)}
                disabled={isLoading}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="form-field">
        <div className="flex items-center">
            <Label htmlFor="contextText">Additional Information</Label>
            <OptionalIndicator />
        </div>
        <Textarea id="contextText" placeholder="Add any extra context or instructions here." value={contextText} onChange={(e) => setContextText(e.target.value)} disabled={isLoading} className="min-h-[100px]" />
      </div>

      <div className="form-field">
        <div className="flex items-center">
            <Label htmlFor="attachmentUrl">Reading Material</Label>
            <OptionalIndicator />
        </div>
        <div className="flex items-center gap-2">
          <Input type="url" id="attachmentUrl" placeholder="https://example.com" value={attachmentUrl} onChange={(e) => setAttachmentUrl(e.target.value)} disabled={isLoading} />
          <Button type="button" variant="outline" onClick={handleTestLink} disabled={!attachmentUrl || isLoading}>
            {linkStatus === 'testing' && 'Testing...'}
            {linkStatus === 'idle' && 'Test Link'}
            {linkStatus === 'valid' && 'Valid'}
            {linkStatus === 'invalid' && 'Invalid'}
          </Button>
        </div>
        {recentUrls.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
            Recent:
            {recentUrls.map(url => (
              <button key={url} type="button" className="underline" onClick={() => setAttachmentUrl(url)}>{new URL(url).hostname}</button>
            ))}
          </div>
        )}
      </div>

      <div className="form-field">
        <div className="flex items-center">
            <Label htmlFor="notes">Notes for student</Label>
            <OptionalIndicator />
        </div>
        <Textarea id="notes" placeholder="These notes will be visible to students on the assignment page." value={notes} onChange={(e) => setNotes(e.target.value)} disabled={isLoading} rows={3} />
      </div>

      <div className="form-field">
        <Label htmlFor="assignmentNotification">Assignment Status</Label>
        <select
          id="assignmentNotification"
          value={assignmentNotification}
          onChange={(e) => setAssignmentNotification(e.target.value as AssignmentNotification)}
          disabled={isLoading}
          className="w-full rounded-md border border-border bg-card/70 p-2 text-foreground shadow-sm"
        >
          <option value={AssignmentNotification.NOT_ASSIGNED}>Save only</option>
          <option value={AssignmentNotification.ASSIGN_WITHOUT_NOTIFICATION}>Assign to All Students Now</option>
          <option value={AssignmentNotification.ASSIGN_AND_NOTIFY}>Assign to All and Notify Now</option>
          <option value={AssignmentNotification.ASSIGN_ON_DATE}>Assign on a Specific Date</option>
        </select>
      </div>

      {assignmentNotification === "ASSIGN_ON_DATE" && (
        <div className="form-field animate-fade-in-up">
          <Label htmlFor="scheduledDate">Scheduled Assignment Date & Time</Label>
          <Input
            type="datetime-local"
            id="scheduledDate"
            value={scheduledDate}
            onChange={e => setScheduledDate(e.target.value)}
            required
            disabled={isLoading}
            className="w-full"
          />
        </div>
      )}
      
      <Button type="submit" disabled={isLoading || isUploading} className="w-full">
        {isLoading ? (isEditMode ? 'Saving...' : 'Creating...') : (isEditMode ? 'Save Changes' : 'Create Lesson')}
      </Button>
    </form>
  );
}
