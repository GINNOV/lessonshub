// file: src/app/components/FlashcardCreator.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Lesson, Flashcard as PrismaFlashcard } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Upload, Info } from 'lucide-react';
import ImageBrowser from './ImageBrowser';
import { LessonDifficultySelector } from '@/app/components/LessonDifficultySelector';

type SerializableLesson = Omit<Lesson, 'price'>;

type LessonWithFlashcards = SerializableLesson & {
  flashcards: PrismaFlashcard[];
};

type TeacherPreferences = {
    defaultLessonPrice?: number | null;
    defaultLessonPreview?: string | null;
    defaultLessonInstructions?: string | null;
    defaultLessonNotes?: string | null;
};

interface InstructionBooklet {
  id: string;
  title: string;
  body: string;
}

interface FlashcardCreatorProps {
  lesson?: LessonWithFlashcards & { price: number } | null;
  teacherPreferences?: TeacherPreferences | null;
  instructionBooklets?: InstructionBooklet[];
}

type FlashcardState = {
    term: string;
    definition: string;
    termImageUrl: string | null;
    definitionImageUrl: string | null;
};

const parseCsv = (content: string): string[][] => {
  const rows: string[][] = [];
  let currentField = '';
  let currentRow: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];

    if (char === '"') {
      if (inQuotes && content[i + 1] === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      currentRow.push(currentField);
      currentField = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && content[i + 1] === '\n') {
        i++;
      }
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = '';
      continue;
    }

    currentField += char;
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows.filter((row) => row.some((field) => field.trim().length));
};

const normalizeUrl = (value?: string): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const parseFlashcardCsv = (content: string): FlashcardState[] => {
  const rows = parseCsv(content);
  if (rows.length === 0) return [];

  const headers = rows[0].map((header) => header.trim().toLowerCase());
  const frontIndex = headers.indexOf('front');
  const frontImageIndex = headers.indexOf('front_image');
  const backIndex = headers.indexOf('back');
  const backImageIndex = headers.indexOf('back_image');

  if (frontIndex === -1 || backIndex === -1) {
    throw new Error('CSV file must include "front" and "back" columns in the header row.');
  }

  return rows.slice(1).reduce<FlashcardState[]>((acc, row) => {
    const term = row[frontIndex]?.trim() ?? '';
    const definition = row[backIndex]?.trim() ?? '';
    const termImageUrl = normalizeUrl(frontImageIndex >= 0 ? row[frontImageIndex] : undefined);
    const definitionImageUrl = normalizeUrl(backImageIndex >= 0 ? row[backImageIndex] : undefined);

    if (!term && !definition && !termImageUrl && !definitionImageUrl) {
      return acc;
    }

    acc.push({
      term,
      definition,
      termImageUrl,
      definitionImageUrl,
    });

    return acc;
  }, []);
};

const OptionalIndicator = () => <Info className="text-gray-400 ml-1 h-4 w-4" />;

const isBlobHosted = (url: string | null): boolean => {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.hostname.endsWith('.public.blob.vercel-storage.com');
  } catch {
    return false;
  }
};

export default function FlashcardCreator({ lesson, teacherPreferences, instructionBooklets = [] }: FlashcardCreatorProps) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState(teacherPreferences?.defaultLessonPrice?.toString() || '0');
  const [lessonPreview, setLessonPreview] = useState(teacherPreferences?.defaultLessonPreview || '');
  const [assignmentText, setAssignmentText] = useState(teacherPreferences?.defaultLessonInstructions || '👉🏼 INSTRUCTIONS:\n');
  const [contextText, setContextText] = useState('');
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

  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [notes, setNotes] = useState(teacherPreferences?.defaultLessonNotes || '');
  const [recentUrls, setRecentUrls] = useState<string[]>([]);
  const [flashcards, setFlashcards] = useState<FlashcardState[]>([{ term: '', definition: '', termImageUrl: null, definitionImageUrl: null }]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [linkStatus, setLinkStatus] = useState<'idle' | 'testing' | 'valid' | 'invalid'>('idle');
  const [difficulty, setDifficulty] = useState<number>(lesson?.difficulty ?? 3);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedBookletId, setSelectedBookletId] = useState('');
  const isEditMode = !!lesson;

  useEffect(() => {
    if (lesson) {
      setTitle(lesson.title);
      setPrice(lesson.price.toString());
      setLessonPreview(lesson.lesson_preview || '');
      setAssignmentText(lesson.assignment_text || '👉🏼 INSTRUCTIONS:\n');
      setAssignmentImageUrl(lesson.assignment_image_url || null);
      setSoundcloudUrl(lesson.soundcloud_url || '');
      setContextText(lesson.context_text || '');
      setAttachmentUrl(lesson.attachment_url || '');
      setNotes(lesson.notes || '');
      setDifficulty(lesson.difficulty ?? 3);
      if (lesson.flashcards && lesson.flashcards.length > 0) {
        setFlashcards(lesson.flashcards.map(fc => ({ 
            term: fc.term, 
            definition: fc.definition, 
            termImageUrl: fc.termImageUrl, 
            definitionImageUrl: fc.definitionImageUrl 
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
      const data = await response.json();
      setLinkStatus(data?.success ? 'valid' : 'invalid');
      if (data?.success) {
        addUrlToRecents(attachmentUrl);
      }
    } catch (error) {
      setLinkStatus('invalid');
    }
  };

  const handleFlashcardChange = (index: number, field: 'term' | 'definition', value: string) => {
    const newFlashcards = [...flashcards];
    newFlashcards[index][field] = value;
    setFlashcards(newFlashcards);
  };
  
  const handleCardImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, index: number, field: 'termImageUrl' | 'definitionImageUrl') => {
    event.preventDefault();
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingIndex(index);
    try {
      const response = await fetch(`/api/upload?filename=${file.name}`, { method: 'POST', body: file });
      if (!response.ok) {
        throw new Error("Upload failed");
      }
      const newBlob = await response.json();
      if (newBlob?.url) {
        const newFlashcards = [...flashcards];
        newFlashcards[index][field] = newBlob.url;
        setFlashcards(newFlashcards);
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploadingIndex(null);
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

  const addFlashcard = () => {
    setFlashcards([...flashcards, { term: '', definition: '', termImageUrl: null, definitionImageUrl: null }]);
  };

  const handleCsvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const content = await file.text();
      const parsedFlashcards = parseFlashcardCsv(content);
      if (parsedFlashcards.length === 0) {
        throw new Error('No flashcards found in the CSV file.');
      }
      setFlashcards(parsedFlashcards);
      toast.success(`Loaded ${parsedFlashcards.length} flashcard${parsedFlashcards.length === 1 ? '' : 's'} from CSV.`);
    } catch (error) {
      toast.error((error as Error).message || 'Unable to load CSV file.');
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  };

  const removeFlashcard = (index: number) => {
    const newFlashcards = flashcards.filter((_, i) => i !== index);
    setFlashcards(newFlashcards);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const validFlashcards = flashcards.filter(fc => fc.term.trim() && fc.definition.trim());

    if (!title.trim()) {
      toast.error('Lesson title cannot be empty.');
      setIsLoading(false);
      return;
    }
    if (!difficulty || difficulty < 1 || difficulty > 5) {
      toast.error('Please choose a difficulty before saving.');
      setIsLoading(false);
      return;
    }
    if (validFlashcards.length === 0) {
      toast.error('You must include at least one valid flashcard.');
      setIsLoading(false);
      return;
    }

    const url = isEditMode ? `/api/lessons/flashcard/${lesson!.id}` : '/api/lessons/flashcard';
    const method = isEditMode ? 'PATCH' : 'POST';

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            title, 
            price: parseFloat(price) || 0, 
            lesson_preview: lessonPreview, 
            assignment_text: assignmentText, 
            context_text: contextText,
            assignment_image_url: assignmentImageUrl,
            soundcloud_url: soundcloudUrl,
            attachment_url: attachmentUrl, 
            notes,
            difficulty,
            flashcards: validFlashcards 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save lesson');
      }

      toast.success(`Lesson successfully ${isEditMode ? 'updated' : 'created'}!`);
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
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Common English Idioms" />
      </div>
      <div className="space-y-2">
         <Label htmlFor="price">Price (€)</Label>
         <Input id="price" type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} disabled={isLoading} />
      </div>

      <LessonDifficultySelector value={difficulty} onChange={setDifficulty} disabled={isLoading} />

       <div className="space-y-2">
        <Label htmlFor="lessonPreview">Lesson Preview</Label>
        <Textarea id="lessonPreview" placeholder="A brief preview of the lesson for students." value={lessonPreview} onChange={(e) => setLessonPreview(e.target.value)} />
      </div>

       <div className="space-y-2">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <Label htmlFor="assignmentText" className="text-base font-semibold">Instructions</Label>
          {instructionBooklets.length > 0 && (
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <select
                value={selectedBookletId}
                onChange={(e) => setSelectedBookletId(e.target.value)}
                className="rounded-md border border-gray-300 p-2 text-sm shadow-sm"
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
        <Textarea
          id="assignmentText"
          placeholder="Describe the main task for the student."
          value={assignmentText}
          onChange={(e) => setAssignmentText(e.target.value)}
        />
        <p className="text-xs text-gray-500">
          Need reusable sets?{' '}
          <a href="/dashboard/instructions" className="font-semibold text-indigo-600 hover:underline">
            Manage instruction booklets
          </a>
        </p>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center">
            <Label htmlFor="assignmentImage">Assignment Image</Label><OptionalIndicator/>
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
            <Label htmlFor="soundcloudUrl">Audio Material</Label><OptionalIndicator/>
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
            <Label htmlFor="attachmentUrl">Reading Material</Label><OptionalIndicator/>
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
          <Label htmlFor="notes">Notes for student</Label><OptionalIndicator/>
        </div>
        <Textarea id="notes" placeholder="These notes will be visible to students on the assignment page." value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
      </div>

      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div className="space-y-1">
            <Label htmlFor="flashcardCsv">Import flashcards from CSV</Label>
            <p className="text-xs text-gray-500">Expected columns: front, front_image, back, back_image.</p>
          </div>
          <Input id="flashcardCsv" type="file" accept=".csv,text/csv" onChange={handleCsvUpload} disabled={isLoading || isImporting} className="md:w-72" />
        </div>
        {isImporting && <p className="text-sm text-gray-500">Loading CSV…</p>}
        {flashcards.map((fc, index) => (
          <div key={index} className="p-4 border rounded-md space-y-4">
              <div className="flex justify-between items-center">
                  <h3 className="font-semibold">Flashcard {index + 1}</h3>
                  <Button type="button" variant="destructive" size="sm" onClick={() => removeFlashcard(index)} disabled={flashcards.length <= 1}>Delete Card</Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Term Side */}
                <div className="space-y-2">
                    <Label>Term (Front)</Label>
                    <Input placeholder="e.g., Break a leg" value={fc.term} onChange={(e) => handleFlashcardChange(index, 'term', e.target.value)} />
                    <Label htmlFor={`term-image-${index}`} className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer"><Upload size={16} /> Upload Image</Label>
                    <Input id={`term-image-${index}`} type="file" className="hidden" onChange={(e) => handleCardImageUpload(e, index, 'termImageUrl')} />
                    {fc.termImageUrl && (
                      isBlobHosted(fc.termImageUrl) ? (
                        <Image src={fc.termImageUrl} alt="Term image" width={100} height={100} className="rounded-md mt-2" />
                      ) : (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element -- external image hosts are not whitelisted so we fallback to a native img */}
                          <img src={fc.termImageUrl} alt="Term image" className="rounded-md mt-2 h-[100px] w-[100px] object-cover" loading="lazy" />
                        </>
                      )
                    )}
                </div>
                {/* Definition Side */}
                <div className="space-y-2">
                    <Label>Definition (Back)</Label>
                    <Input placeholder="e.g., Good luck!" value={fc.definition} onChange={(e) => handleFlashcardChange(index, 'definition', e.target.value)} />
                    <Label htmlFor={`def-image-${index}`} className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer"><Upload size={16} /> Upload Image</Label>
                    <Input id={`def-image-${index}`} type="file" className="hidden" onChange={(e) => handleCardImageUpload(e, index, 'definitionImageUrl')} />
                    {fc.definitionImageUrl && (
                      isBlobHosted(fc.definitionImageUrl) ? (
                        <Image src={fc.definitionImageUrl} alt="Definition image" width={100} height={100} className="rounded-md mt-2" />
                      ) : (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element -- external image hosts are not whitelisted so we fallback to a native img */}
                          <img src={fc.definitionImageUrl} alt="Definition image" className="rounded-md mt-2 h-[100px] w-[100px] object-cover" loading="lazy" />
                        </>
                      )
                    )}
                </div>
              </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between">
        <Button type="button" onClick={addFlashcard}>Add Flashcard</Button>
        <Button type="submit" disabled={isLoading || uploadingIndex !== null}>{isLoading ? 'Saving...' : 'Save Lesson'}</Button>
      </div>
    </form>
  );
}
