// file: src/app/components/MultiChoiceCreator.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lesson, MultiChoiceQuestion as PrismaQuestion, MultiChoiceOption as PrismaOption, AssignmentNotification } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import Image from 'next/image';
import ImageBrowser from './ImageBrowser';
import { Info, Download } from 'lucide-react';
import { LessonDifficultySelector } from '@/app/components/LessonDifficultySelector';
import ManageInstructionBookletsLink from '@/app/components/ManageInstructionBookletsLink';
import FileUploadButton from '@/components/FileUploadButton';
import { Switch } from '@/components/ui/switch';

type SerializableLesson = Omit<Lesson, 'price'> & { isFreeForAll?: boolean };

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

interface InstructionBooklet {
  id: string;
  title: string;
  body: string;
}

interface MultiChoiceCreatorProps {
  lesson?: LessonWithQuestions | null;
  teacherPreferences?: TeacherPreferences | null;
  instructionBooklets?: InstructionBooklet[];
}

type OptionState = {
    text: string;
    isCorrect: boolean;
};

type QuestionState = {
    question: string;
    options: OptionState[];
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

const parseMultiChoiceCsv = (content: string): QuestionState[] => {
  const rows = parseCsv(content);
  if (rows.length === 0) return [];

  const headers = rows[0].map((header) => header.trim().toLowerCase());
  const questionIndex = headers.indexOf('question');
  const rightAnswerIndex = headers.indexOf('right_answer_id');
  const answerColumns = headers
    .map((header, idx) => ({ header, idx }))
    .filter(({ header }) => /^answer\d+$/i.test(header))
    .sort((a, b) => a.header.localeCompare(b.header, undefined, { numeric: true }));

  if (questionIndex === -1 || rightAnswerIndex === -1 || answerColumns.length === 0) {
    throw new Error('CSV header must include question, right_answer_id, and answer columns (answer1, answer2, …).');
  }

  return rows.slice(1).reduce<QuestionState[]>((acc, row, rowIdx) => {
    const rowNumber = rowIdx + 2; // account for header row
    const questionText = row[questionIndex]?.trim() ?? '';
    const answers = answerColumns.map(({ header, idx }, orderIndex) => ({
      header,
      orderIndex,
      value: row[idx]?.trim() ?? '',
    }));
    const nonEmptyAnswers = answers.filter((answer) => answer.value.length > 0);

    if (!questionText) {
      if (nonEmptyAnswers.length === 0) {
        return acc; // skip empty row
      }
      throw new Error(`Row ${rowNumber}: question field is required.`);
    }

    if (nonEmptyAnswers.length < 2) {
      throw new Error(`Row ${rowNumber}: please provide at least two answers.`);
    }

    const rightAnswerRaw = row[rightAnswerIndex]?.trim();
    if (!rightAnswerRaw) {
      throw new Error(`Row ${rowNumber}: right_answer_id is required.`);
    }

    const normalizedRight = rightAnswerRaw.toLowerCase();
    let correctOrderIndex = answers.findIndex((answer) => answer.header === normalizedRight);

    if (correctOrderIndex === -1) {
      const numeric = Number.parseInt(rightAnswerRaw, 10);
      if (!Number.isNaN(numeric) && numeric >= 1 && numeric <= answers.length) {
        correctOrderIndex = numeric - 1;
      }
    }

    if (correctOrderIndex === -1) {
      correctOrderIndex = answers.findIndex((answer) => answer.value.toLowerCase() === normalizedRight);
    }

    if (correctOrderIndex === -1) {
      throw new Error(`Row ${rowNumber}: right_answer_id "${rightAnswerRaw}" does not match any answer column.`);
    }

    const correctAnswer = answers[correctOrderIndex];
    if (!correctAnswer.value) {
      throw new Error(`Row ${rowNumber}: right_answer_id points to an empty answer.`);
    }

    const options = nonEmptyAnswers.map((answer) => ({
      text: answer.value,
      isCorrect: answer.orderIndex === correctOrderIndex,
    }));

    if (!options.some((option) => option.isCorrect)) {
      throw new Error(`Row ${rowNumber}: right_answer_id must reference a non-empty answer.`);
    }

    acc.push({
      question: questionText,
      options,
    });

    return acc;
  }, []);
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

const formatDateTimeLocal = (value: string | Date | null | undefined) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export default function MultiChoiceCreator({ lesson, teacherPreferences, instructionBooklets = [] }: MultiChoiceCreatorProps) {
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
  const [assignmentNotification, setAssignmentNotification] = useState<AssignmentNotification>(AssignmentNotification.NOT_ASSIGNED);
  const [scheduledDate, setScheduledDate] = useState('');
  const [questions, setQuestions] = useState<QuestionState[]>([{ question: '', options: [{ text: '', isCorrect: true }, { text: '', isCorrect: false }] }]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedBookletId, setSelectedBookletId] = useState('');
  const [difficulty, setDifficulty] = useState<number>(lesson?.difficulty ?? 3);
  const [isFreeForAll, setIsFreeForAll] = useState<boolean>(lesson?.isFreeForAll ?? false);
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
      setAssignmentNotification(lesson.assignment_notification);
      setScheduledDate(formatDateTimeLocal(lesson.scheduled_assignment_date));
      setDifficulty(lesson.difficulty ?? 3);
      setIsFreeForAll(Boolean((lesson as any).isFreeForAll));
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

  const handleCsvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const content = await file.text();
      const parsedQuestions = parseMultiChoiceCsv(content);
      if (parsedQuestions.length === 0) {
        throw new Error('No questions found in the CSV file.');
      }
      setQuestions(parsedQuestions);
      toast.success(`Loaded ${parsedQuestions.length} question${parsedQuestions.length === 1 ? '' : 's'} from CSV.`);
    } catch (error) {
      toast.error((error as Error).message || 'Unable to load CSV file.');
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!difficulty || difficulty < 1 || difficulty > 5) {
      toast.error('Please choose a difficulty before saving.');
      setIsLoading(false);
      return;
    }

    let scheduledDatePayload: Date | null = null;
    if (assignmentNotification === AssignmentNotification.ASSIGN_ON_DATE) {
      if (!scheduledDate) {
        toast.error('Please select a date and time to schedule the assignment.');
        setIsLoading(false);
        return;
      }
      const parsed = new Date(scheduledDate);
      if (Number.isNaN(parsed.getTime())) {
        toast.error('Please provide a valid date and time for the scheduled assignment.');
        setIsLoading(false);
        return;
      }
      scheduledDatePayload = parsed;
    }

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
                difficulty,
                questions,
                assignment_notification: assignmentNotification,
                scheduled_assignment_date: scheduledDatePayload,
                isFreeForAll,
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

  const downloadQuestionTemplate = () => {
    const headers = ['question', 'right_answer_id', 'answer1', 'answer2', 'answer3', 'answer4'];
    const sampleRows = [
      {
        question: 'Which vowel shape starts the warmup?',
        options: ['AH', 'OO', 'EE'],
        correctIndex: 0,
      },
      {
        question: 'Where should the student breathe?',
        options: ['After every bar', 'Only at the rest symbol', 'Never'],
        correctIndex: 1,
      },
    ];
    const source = questions.length ? questions : sampleRows.map((row) => ({
      question: row.question,
      options: row.options.map((text, idx) => ({ text, isCorrect: idx === row.correctIndex })),
    }));
    const dataRows = source.map((question) => {
      const answerColumns = question.options.slice(0, 4).map((opt) => opt.text);
      while (answerColumns.length < 4) {
        answerColumns.push('');
      }
      const correctIndex = question.options.findIndex((opt) => opt.isCorrect);
      const correctId =
        correctIndex >= 0 ? `answer${correctIndex + 1}` : 'answer1';
      return [question.question ?? '', correctId, ...answerColumns];
    });
    const rows = [headers, ...dataRows];
    const csv = rows
      .map((row) => row.map((value) => `"${(value ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'multi-choice-template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
       <div className="form-field">
        <Label htmlFor="title">Lesson Title</Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., English Prepositions Quiz" />
      </div>

      <div className="form-field">
         <Label htmlFor="price">Price (€)</Label>
         <Input id="price" type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} disabled={isLoading} />
     </div>
      <div className="flex items-start justify-between rounded-lg border p-4">
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
        <Label htmlFor="lessonPreview">Lesson Preview</Label>
        <Textarea id="lessonPreview" placeholder="A brief preview of the lesson for students." value={lessonPreview} onChange={(e) => setLessonPreview(e.target.value)} />
      </div>

       <div className="form-field">
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
          <ManageInstructionBookletsLink />
        </p>
      </div>

       <div className="form-field">
        <div className="flex items-center">
            <Label htmlFor="assignmentImage">Assignment Image</Label>
            <OptionalIndicator />
        </div>
        <div className="flex items-center gap-2">
            <FileUploadButton
              id="assignmentImage"
              onChange={handleAssignmentImageUpload}
              disabled={isLoading || isUploading}
              accept="image/*"
              className="flex-grow"
            />
            <ImageBrowser onSelectImage={setAssignmentImageUrl} />
        </div>
        {isUploading && <p className="text-sm text-gray-500">Uploading...</p>}
        {assignmentImageUrl && <Image src={assignmentImageUrl} alt="Uploaded preview" width={500} height={300} className="mt-4 w-full h-auto rounded-md border" />}
      </div>
      
       <div className="form-field">
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
      
       <div className="form-field">
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
      
      <div className="form-field">
        <div className="flex items-center">
            <Label htmlFor="notes">Notes for student</Label>
            <OptionalIndicator />
        </div>
        <Textarea id="notes" placeholder="These notes will be visible to students on the assignment page." value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
      </div>

      <div className="form-field">
        <Label htmlFor="assignmentNotification">Assignment Status</Label>
        <select
          id="assignmentNotification"
          value={assignmentNotification}
          onChange={(e) => setAssignmentNotification(e.target.value as AssignmentNotification)}
          disabled={isLoading}
          className="w-full rounded-md border border-gray-300 p-2 shadow-sm"
        >
          <option value={AssignmentNotification.NOT_ASSIGNED}>Save only</option>
          <option value={AssignmentNotification.ASSIGN_WITHOUT_NOTIFICATION}>Assign to All Students Now</option>
          <option value={AssignmentNotification.ASSIGN_AND_NOTIFY}>Assign to All and Notify Now</option>
          <option value={AssignmentNotification.ASSIGN_ON_DATE}>Assign on a Specific Date</option>
        </select>
      </div>

      {assignmentNotification === AssignmentNotification.ASSIGN_ON_DATE && (
        <div className="form-field">
          <Label htmlFor="scheduledDate">Scheduled Assignment Date &amp; Time</Label>
          <Input
            type="datetime-local"
            id="scheduledDate"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            disabled={isLoading}
            required
          />
        </div>
      )}

      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div className="space-y-1 w-full">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="questionsCsv">Import questions from CSV</Label>
              <Button type="button" variant="ghost" size="sm" onClick={downloadQuestionTemplate} className="text-xs font-semibold">
                <Download className="mr-2 h-4 w-4" />
                Download template
              </Button>
            </div>
            <p className="text-xs text-gray-500">Columns: question, right_answer_id, answer1, answer2, answer3 (answer4 optional).</p>
          </div>
          <FileUploadButton
            id="questionsCsv"
            accept=".csv,text/csv"
            onChange={handleCsvUpload}
            disabled={isLoading || isImporting}
            className="md:w-72"
          />
        </div>
        {isImporting && <p className="text-sm text-gray-500">Loading CSV…</p>}
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
