// file: src/app/components/ComposerLessonCreator.tsx
'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Lesson } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { LessonDifficultySelector } from '@/app/components/LessonDifficultySelector';
import FileUploadButton from '@/components/FileUploadButton';
import ImageBrowser from './ImageBrowser';
import { toast } from 'sonner';
import { parseComposerSentence } from '@/lib/composer';
import { parseCsv } from '@/lib/csv';
import { Download, Info, Upload } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { formatAutoSaveStatus, useLessonAutosave } from '@/app/components/useLessonAutosave';

type SerializableLesson = Omit<Lesson, 'price'> & {
  price: number;
  composerConfig?: {
    hiddenSentence: string;
    questionBank: ComposerQuestion[];
    maxTries?: number | null;
  } | null;
  isFreeForAll?: boolean;
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

type ComposerQuestion = {
  id: string;
  prompt: string;
  answer: string;
  maxTries?: number | null;
};

interface ComposerLessonCreatorProps {
  lesson?: SerializableLesson | null;
  teacherPreferences?: TeacherPreferences | null;
  instructionBooklets?: InstructionBooklet[];
}

export default function ComposerLessonCreator({
  lesson,
  teacherPreferences,
  instructionBooklets = [],
}: ComposerLessonCreatorProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const autoSaveEnabled = !((session?.user as any)?.lessonAutoSaveOptOut ?? false);
  const isEditMode = Boolean(lesson?.id);

  const [title, setTitle] = useState('');
  const [lessonPreview, setLessonPreview] = useState(teacherPreferences?.defaultLessonPreview || '');
  const [price, setPrice] = useState(teacherPreferences?.defaultLessonPrice?.toString() || '0');
  const [assignmentText, setAssignmentText] = useState(teacherPreferences?.defaultLessonInstructions || '👉🏼 INSTRUCTIONS:\n');
  const [selectedBookletId, setSelectedBookletId] = useState('');
  const [contextText, setContextText] = useState('');
  const [notes, setNotes] = useState(teacherPreferences?.defaultLessonNotes || '');
  const [hiddenSentence, setHiddenSentence] = useState('');
  const [questions, setQuestions] = useState<ComposerQuestion[]>([]);
  const [maxTries, setMaxTries] = useState('1');
  const [difficulty, setDifficulty] = useState<number>(lesson?.difficulty ?? 3);
  const [isFreeForAll, setIsFreeForAll] = useState<boolean>(lesson?.isFreeForAll ?? false);
  const [assignmentImageUrl, setAssignmentImageUrl] = useState<string | null>(null);
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [recentUrls, setRecentUrls] = useState<string[]>([]);
  const [soundcloudUrl, setSoundcloudUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [feedTracks, setFeedTracks] = useState<{ title: string; link: string }[]>([]);

  useEffect(() => {
    if (!lesson) return;
    setTitle(lesson.title);
    setLessonPreview(lesson.lesson_preview || '');
    setPrice(lesson.price.toString());
    setAssignmentText(lesson.assignment_text || '👉🏼 INSTRUCTIONS:\n');
    setContextText(lesson.context_text || '');
    setNotes(lesson.notes || '');
    setDifficulty(lesson.difficulty ?? 3);
    setAssignmentImageUrl(lesson.assignment_image_url || null);
    setAttachmentUrl(lesson.attachment_url || '');
    setSoundcloudUrl(lesson.soundcloud_url || '');
    setIsFreeForAll(Boolean((lesson as any).isFreeForAll));
    if (lesson.composerConfig?.maxTries) {
      setMaxTries(String(lesson.composerConfig.maxTries));
    }
    if (lesson.composerConfig) {
      setHiddenSentence(lesson.composerConfig.hiddenSentence || '');
      setQuestions(
        Array.isArray(lesson.composerConfig.questionBank)
          ? (lesson.composerConfig.questionBank as ComposerQuestion[])
          : []
      );
    }
  }, [lesson]);

  useEffect(() => {
    try {
      const savedUrls = localStorage.getItem('recentAttachmentUrls');
      if (savedUrls) {
        setRecentUrls(JSON.parse(savedUrls));
      }
    } catch (error) {
      console.error('Failed to parse recent URLs', error);
    }
  }, []);

  const OptionalIndicator = () => <Info className="ml-1 h-4 w-4 text-muted-foreground" />;

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
    try {
      const u = new URL(url);
      return /youtu\.be|youtube\.com/i.test(u.hostname);
    } catch {
      return false;
    }
  };
  const isSoundCloud = (url: string) => {
    try {
      const u = new URL(url);
      return /soundcloud\.com/i.test(u.hostname);
    } catch {
      return false;
    }
  };
  const getYouTubeId = (url: string): string | null => {
    try {
      const u = new URL(url);
      if (u.hostname.includes('youtu.be')) return u.pathname.replace('/', '');
      if (u.searchParams.get('v')) return u.searchParams.get('v');
      const parts = u.pathname.split('/').filter(Boolean);
      if (parts[0] === 'embed' || parts[0] === 'shorts') return parts[1] || null;
      return null;
    } catch {
      return null;
    }
  };

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
    } catch (error) {
      setFeedError((error as Error).message || 'Unable to load feed');
    } finally {
      setFeedLoading(false);
    }
  };

  const { uniqueWords } = useMemo(() => parseComposerSentence(hiddenSentence), [hiddenSentence]);
  const normalizedWords = useMemo(
    () => uniqueWords.map((word) => word.toLowerCase()),
    [uniqueWords],
  );

  const questionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    questions.forEach((question) => {
      const key = question.answer.trim().toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return counts;
  }, [questions]);

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        prompt: '',
        answer: uniqueWords[0] || '',
        maxTries: null,
      },
    ]);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    const file = event.target.files?.[0];
    if (!file) {
      toast.error('No file selected.');
      return;
    }
    setIsUploading(true);
    try {
      const response = await fetch(`/api/upload?filename=${file.name}`, { method: 'POST', body: file });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || `Upload failed with status ${response.status}`);
      }
      const newBlob = await response.json();
      if (newBlob?.url) {
        setAssignmentImageUrl(newBlob.url);
      } else {
        throw new Error('Failed to get image URL from the server.');
      }
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsUploading(false);
    }
  };

  const addUrlToRecents = (url: string) => {
    if (!url) return;
    try {
      const updatedUrls = [url, ...recentUrls.filter((existing) => existing !== url)].slice(0, 3);
      setRecentUrls(updatedUrls);
      localStorage.setItem('recentAttachmentUrls', JSON.stringify(updatedUrls));
    } catch (error) {
      console.error('Failed to store recent URLs', error);
    }
  };

  const handleTestLink = async () => {
    if (!attachmentUrl) return;
    try {
      const response = await fetch('/api/lessons/test-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: attachmentUrl }),
      });
      const data = await response.json().catch(() => null);
      if (data?.success) {
        toast.success('Reading material link is valid.');
        addUrlToRecents(attachmentUrl);
      } else {
        toast.error('Link is invalid or unreachable.');
      }
    } catch (error) {
      toast.error('Unable to test the link right now.');
    }
  };

  const parseComposerCsv = (content: string): ComposerQuestion[] => {
    const rows = parseCsv(content);
    if (rows.length === 0) return [];
    const headers = rows[0].map((header) => header.trim().toLowerCase());
    const wordIndex = headers.indexOf('word');
    const sentenceIndex = headers.indexOf('sentence');
    const maxTriesIndex = headers.findIndex(
      (header) => header === 'max_tries' || header === 'max tries' || header === 'maxtries',
    );
    if (wordIndex === -1 || sentenceIndex === -1) {
      throw new Error('CSV header must include word and sentence.');
    }

    return rows.slice(1).reduce<ComposerQuestion[]>((acc, row, rowIdx) => {
      const rowNumber = rowIdx + 2;
      const word = row[wordIndex]?.trim() ?? '';
      const sentence = row[sentenceIndex]?.trim() ?? '';
      const rawMaxTries = maxTriesIndex >= 0 ? row[maxTriesIndex]?.trim() : '';
      let maxTriesValue: number | null = null;
      if (rawMaxTries) {
        const parsedMaxTries = Number(rawMaxTries);
        if (!Number.isInteger(parsedMaxTries) || parsedMaxTries < 1) {
          throw new Error(`Row ${rowNumber}: max_tries must be a whole number greater than 0.`);
        }
        maxTriesValue = parsedMaxTries;
      }
      if (!word && !sentence) return acc;
      if (!word || !sentence) {
        throw new Error(`Row ${rowNumber}: word and sentence are required.`);
      }
      acc.push({
        id: crypto.randomUUID(),
        answer: word,
        prompt: sentence,
        maxTries: maxTriesValue,
      });
      return acc;
    }, []);
  };

  const handleCsvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const content = await file.text();
      const imported = parseComposerCsv(content);
      if (imported.length === 0) {
        toast.error('No questions found in the CSV.');
      } else {
        setQuestions(imported);
        toast.success(`Imported ${imported.length} questions.`);
      }
    } catch (error) {
      toast.error((error as Error).message || 'Failed to import CSV.');
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  };

  const downloadCsvTemplate = () => {
    const headers = ['word', 'sentence', 'max_tries'];
    const sampleRows = [
      ['snow', 'Which word completes the phrase "Let it ___"?', ''],
      ['night', 'Fill the missing word: "Silent ____".', '3'],
    ];
    const rows = [headers, ...sampleRows];
    const csv = rows
      .map((row) => row.map((value) => `"${(value ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'composer-template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const updateQuestion = (id: string, patch: Partial<ComposerQuestion>) => {
    setQuestions((prev) =>
      prev.map((question) => (question.id === id ? { ...question, ...patch } : question)),
    );
  };

  const removeQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((question) => question.id !== id));
  };

  const validate = () => {
    if (!title.trim()) {
      toast.error('Lesson title is required.');
      return false;
    }
    if (!lessonPreview.trim()) {
      toast.error('Lesson preview is required.');
      return false;
    }
    if (!hiddenSentence.trim()) {
      toast.error('Hidden sentence is required.');
      return false;
    }
    if (!difficulty || difficulty < 1 || difficulty > 5) {
      toast.error('Please choose a difficulty level between 1 and 5.');
      return false;
    }
    if (questions.length === 0) {
      toast.error('Add at least one question.');
      return false;
    }
    const incomplete = questions.some((question) => !question.prompt.trim() || !question.answer.trim());
    if (incomplete) {
      toast.error('Each question needs a prompt and an answer word.');
      return false;
    }
    if (normalizedWords.length === 0) {
      toast.error('Hidden sentence must include at least one word.');
      return false;
    }
    const missing = normalizedWords.filter((word) => !questionCounts.get(word));
    if (missing.length > 0) {
      toast.error(`Add at least one question for: ${missing.join(', ')}`);
      return false;
    }
    const maxTriesValue = Number(maxTries);
    if (!Number.isInteger(maxTriesValue) || maxTriesValue < 1) {
      toast.error('Max tries must be a whole number greater than 0.');
      return false;
    }
    const invalidQuestionMax = questions.find(
      (question) => question.maxTries !== null && question.maxTries !== undefined
        && (!Number.isInteger(question.maxTries) || question.maxTries < 1),
    );
    if (invalidQuestionMax) {
      toast.error('Question max tries must be a whole number greater than 0.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    const url = isEditMode ? `/api/lessons/composer/${lesson?.id}` : '/api/lessons/composer';
    const method = isEditMode ? 'PATCH' : 'POST';
    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          lesson_preview: lessonPreview,
          assignment_text: assignmentText,
          context_text: contextText,
          notes,
          hiddenSentence,
          questions,
          maxTries: Number(maxTries),
          price: parseFloat(price) || 0,
          difficulty,
          assignment_image_url: assignmentImageUrl,
          attachment_url: attachmentUrl,
          soundcloud_url: soundcloudUrl,
          isFreeForAll,
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Failed to save composer lesson.');
      }
      toast.success('Composer lesson saved successfully!');
      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const maxTriesValue = Number(maxTries);
  const hasValidMaxTries = Number.isInteger(maxTriesValue) && maxTriesValue >= 1;
  const hasValidQuestions =
    questions.length > 0 &&
    questions.every((question) => question.prompt.trim() && question.answer.trim()) &&
    questions.every(
      (question) =>
        question.maxTries === null ||
        question.maxTries === undefined ||
        (Number.isInteger(question.maxTries) && question.maxTries > 0)
    );
  const missingWords = normalizedWords.filter((word) => !questionCounts.get(word));
  const canAutoSave =
    isEditMode &&
    title.trim().length > 0 &&
    lessonPreview.trim().length > 0 &&
    hiddenSentence.trim().length > 0 &&
    Number.isInteger(difficulty) &&
    difficulty >= 1 &&
    difficulty <= 5 &&
    hasValidQuestions &&
    normalizedWords.length > 0 &&
    missingWords.length === 0 &&
    hasValidMaxTries;

  const handleAutoSave = useCallback(async () => {
    if (!lesson) return false;
    const response = await fetch(`/api/lessons/composer/${lesson.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        lesson_preview: lessonPreview,
        assignment_text: assignmentText,
        context_text: contextText,
        notes,
        hiddenSentence,
        questions,
        maxTries: maxTriesValue,
        price: parseFloat(price) || 0,
        difficulty,
        assignment_image_url: assignmentImageUrl,
        attachment_url: attachmentUrl,
        soundcloud_url: soundcloudUrl,
        isFreeForAll,
      }),
    });
    return response.ok;
  }, [
    assignmentImageUrl,
    assignmentText,
    attachmentUrl,
    contextText,
    difficulty,
    hiddenSentence,
    isFreeForAll,
    lesson,
    lessonPreview,
    maxTriesValue,
    notes,
    price,
    questions,
    soundcloudUrl,
    title,
  ]);

  const autoSaveDependencies = useMemo(
    () => [
      title,
      lessonPreview,
      price,
      assignmentText,
      contextText,
      notes,
      hiddenSentence,
      questions,
      maxTriesValue,
      difficulty,
      assignmentImageUrl,
      attachmentUrl,
      soundcloudUrl,
      isFreeForAll,
    ],
    [
      title,
      lessonPreview,
      price,
      assignmentText,
      contextText,
      notes,
      hiddenSentence,
      questions,
      maxTriesValue,
      difficulty,
      assignmentImageUrl,
      attachmentUrl,
      soundcloudUrl,
      isFreeForAll,
    ]
  );

  const { status: autoSaveStatus, lastSavedAt } = useLessonAutosave({
    enabled: autoSaveEnabled,
    isEditMode,
    canSave: canAutoSave,
    isSavingBlocked: isSubmitting || isUploading,
    onSave: handleAutoSave,
    dependencies: autoSaveDependencies,
    resetKey: lesson?.id ?? null,
  });
  const autoSaveMessage = formatAutoSaveStatus(autoSaveStatus, lastSavedAt);

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Lesson Title</Label>
        <Input id="title" value={title} onChange={(event) => setTitle(event.target.value)} disabled={isSubmitting} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="lessonPreview">Lesson Preview</Label>
        <Textarea
          id="lessonPreview"
          value={lessonPreview}
          onChange={(event) => setLessonPreview(event.target.value)}
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="price">Price (€)</Label>
        <Input id="price" type="number" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} disabled={isSubmitting} />
      </div>

      <div className="flex items-start justify-between rounded-lg border bg-card/60 p-4">
        <div>
          <p className="text-sm font-semibold">Make this lesson free for everyone</p>
          <p className="text-xs text-muted-foreground">When enabled, all students can access this lesson.</p>
        </div>
        <Switch checked={isFreeForAll} onCheckedChange={setIsFreeForAll} />
      </div>

      <LessonDifficultySelector value={difficulty} onChange={setDifficulty} disabled={isSubmitting} />

      <div className="space-y-2">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <Label htmlFor="assignmentText" className="text-base font-semibold">Instructions</Label>
        </div>
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
                disabled={!selectedBookletId || isSubmitting}
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
                disabled={!selectedBookletId || isSubmitting}
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
        <Textarea
          id="assignmentText"
          value={assignmentText}
          onChange={(event) => setAssignmentText(event.target.value)}
          rows={4}
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="contextText">Additional Information</Label>
        <Textarea
          id="contextText"
          value={contextText}
          onChange={(event) => setContextText(event.target.value)}
          rows={3}
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="hiddenSentence">Hidden Sentence</Label>
        <Textarea
          id="hiddenSentence"
          value={hiddenSentence}
          onChange={(event) => setHiddenSentence(event.target.value)}
          rows={3}
          disabled={isSubmitting}
          placeholder="Enter the full sentence to reveal."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="maxTries">Max tries per question</Label>
        <Input
          id="maxTries"
          type="number"
          min="1"
          value={maxTries}
          onChange={(event) => setMaxTries(event.target.value)}
          disabled={isSubmitting}
        />
        <p className="text-xs text-muted-foreground">
          Each try above this limit costs the student €50 and 50 points.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Label>Question Bank</Label>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={downloadCsvTemplate}>
              <Download className="mr-2 h-4 w-4" /> Download CSV
            </Button>
            <label className="inline-flex items-center gap-2 rounded-md border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm font-semibold text-slate-100 hover:border-emerald-300/50">
              <Upload className="h-4 w-4" />
              Upload CSV
              <input
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={handleCsvUpload}
                disabled={isImporting}
              />
            </label>
            <Button type="button" variant="outline" onClick={addQuestion}>
              Add question
            </Button>
          </div>
        </div>
        <p className="text-xs text-slate-400">CSV schema: word, sentence, max_tries (optional)</p>
        {questions.length === 0 && (
          <p className="text-sm text-muted-foreground">No questions yet.</p>
        )}
        {questions.map((question, index) => (
          <div key={question.id} className="space-y-3 rounded-lg border border-slate-800/70 bg-slate-900/70 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-100">Question {index + 1}</p>
              <Button type="button" variant="ghost" size="sm" onClick={() => removeQuestion(question.id)}>
                Remove
              </Button>
            </div>
            <div className="space-y-2">
              <Label>Prompt</Label>
              <Textarea
                value={question.prompt}
                onChange={(event) => updateQuestion(question.id, { prompt: event.target.value })}
                rows={2}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label>Correct word</Label>
              <select
                value={question.answer}
                onChange={(event) => updateQuestion(question.id, { answer: event.target.value })}
                className="w-full rounded-md border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
                disabled={isSubmitting}
              >
                {uniqueWords.length === 0 && <option value="">Add a hidden sentence first</option>}
                {!uniqueWords.includes(question.answer) && question.answer && (
                  <option value={question.answer}>{question.answer} (not in sentence)</option>
                )}
                {uniqueWords.map((word) => (
                  <option key={word} value={word}>
                    {word}
                  </option>
                ))}
              </select>
              {question.answer && (
                <p className="text-xs text-slate-400">
                  {questionCounts.get(question.answer.toLowerCase()) || 0} question(s) tagged for “{question.answer}”.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Max tries for this question (optional)</Label>
              <Input
                type="number"
                min="1"
                placeholder="Use global"
                value={question.maxTries ?? ''}
                onChange={(event) => {
                  const rawValue = event.target.value;
                  const value = rawValue === '' ? null : Number(rawValue);
                  updateQuestion(question.id, { maxTries: value });
                }}
                disabled={isSubmitting}
              />
              <p className="text-xs text-slate-400">Leave blank to use the global max tries.</p>
            </div>
          </div>
        ))}
      </div>

      <div className="form-field">
        <div className="flex items-center">
          <Label htmlFor="assignmentImage">Assignment Image</Label>
          <OptionalIndicator />
        </div>
        <div className="flex items-center gap-2">
          <FileUploadButton
            id="assignmentImage"
            onChange={handleImageUpload}
            disabled={isSubmitting || isUploading}
            accept="image/*"
            className="flex-grow"
          />
          <ImageBrowser onSelectImage={setAssignmentImageUrl} />
        </div>
        {isUploading && <p className="text-sm text-muted-foreground">Uploading...</p>}
        {assignmentImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={assignmentImageUrl} alt="Uploaded preview" className="mt-4 h-auto w-full rounded-md border" />
        )}
      </div>

      <div className="form-field">
        <div className="flex items-center">
          <Label htmlFor="attachmentUrl">Reading Material</Label>
          <OptionalIndicator />
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="url"
            id="attachmentUrl"
            placeholder="https://example.com"
            value={attachmentUrl}
            onChange={(event) => setAttachmentUrl(event.target.value)}
            disabled={isSubmitting}
          />
          <Button type="button" variant="outline" onClick={handleTestLink} disabled={!attachmentUrl || isSubmitting}>
            Test Link
          </Button>
        </div>
        {recentUrls.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
            Recent:
            {recentUrls.map((url) => (
              <button
                key={url}
                type="button"
                className="underline"
                onClick={() => setAttachmentUrl(url)}
              >
                {new URL(url).hostname}
              </button>
            ))}
          </div>
        )}
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
          onChange={(event) => setSoundcloudUrl(event.target.value)}
          disabled={isSubmitting}
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
              onChange={(event) => setSoundcloudUrl(event.target.value)}
              value={feedTracks.find((track) => track.link === soundcloudUrl) ? soundcloudUrl : ''}
            >
              <option value="">— Choose a track —</option>
              {feedTracks.map((track) => (
                <option key={track.link} value={track.link}>{track.title}</option>
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

      <div className="space-y-2">
        <Label htmlFor="notes">Teacher Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          disabled={isSubmitting}
        />
      </div>


      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : isEditMode ? 'Save Composer Lesson' : 'Create Composer Lesson'}
      </Button>
      {autoSaveEnabled && isEditMode && autoSaveMessage && (
        <p className="text-xs text-muted-foreground">{autoSaveMessage}</p>
      )}
    </form>
  );
}
