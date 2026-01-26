// file: src/app/components/NewsArticleLessonCreator.tsx
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { AssignmentNotification, Lesson } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { LessonDifficultySelector } from '@/app/components/LessonDifficultySelector';
import FileUploadButton from '@/components/FileUploadButton';
import ImageBrowser from './ImageBrowser';
import { Info, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { formatAutoSaveStatus, useLessonAutosave } from '@/app/components/useLessonAutosave';

type SerializableLesson = Omit<Lesson, 'price'> & {
  price: number;
  newsArticleConfig?: {
    markdown: string;
    maxWordTaps: number | null;
  } | null;
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

interface NewsArticleLessonCreatorProps {
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
  } catch {
    return null;
  }
}

const OptionalIndicator = () => <Info className="ml-1 h-4 w-4 text-muted-foreground" />;

export default function NewsArticleLessonCreator({
  lesson,
  teacherPreferences,
  instructionBooklets = [],
}: NewsArticleLessonCreatorProps) {
  const router = useRouter();
  const inputFileRef = useRef<HTMLInputElement>(null);
  const { data: session } = useSession();
  const autoSaveEnabled = !((session?.user as any)?.lessonAutoSaveOptOut ?? false);
  const isEditMode = Boolean(lesson?.id);

  const [title, setTitle] = useState('');
  const [lessonPreview, setLessonPreview] = useState(teacherPreferences?.defaultLessonPreview || '');
  const [price, setPrice] = useState(teacherPreferences?.defaultLessonPrice?.toString() || '0');
  const [assignmentText, setAssignmentText] = useState(teacherPreferences?.defaultLessonInstructions || '');
  const [notes, setNotes] = useState(teacherPreferences?.defaultLessonNotes || '');
  const [selectedBookletId, setSelectedBookletId] = useState('');
  const [difficulty, setDifficulty] = useState<number>(lesson?.difficulty ?? 3);
  const [isFreeForAll, setIsFreeForAll] = useState<boolean>(lesson?.isFreeForAll ?? false);
  const [markdown, setMarkdown] = useState('');
  const [maxWordTaps, setMaxWordTaps] = useState('');
  const [assignmentImageUrl, setAssignmentImageUrl] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const lastSavedRef = useRef<string>('');

  useEffect(() => {
    if (!lesson) return;
    setTitle(lesson.title);
    setLessonPreview(lesson.lesson_preview || '');
    setPrice(lesson.price.toString());
    setAssignmentText(lesson.assignment_text || '');
    setNotes(lesson.notes || '');
    setDifficulty(lesson.difficulty ?? 3);
    setIsFreeForAll(Boolean((lesson as any).isFreeForAll));
    setAssignmentImageUrl(lesson.assignment_image_url || null);
    if (lesson.newsArticleConfig) {
      setMarkdown(lesson.newsArticleConfig.markdown || '');
      setMaxWordTaps(
        typeof lesson.newsArticleConfig.maxWordTaps === 'number'
          ? String(lesson.newsArticleConfig.maxWordTaps)
          : ''
      );
    }
    lastSavedRef.current = JSON.stringify({
      title: lesson.title,
      lesson_preview: lesson.lesson_preview || '',
      assignment_text: lesson.assignment_text || null,
      notes: lesson.notes || null,
      price: lesson.price,
      difficulty: lesson.difficulty ?? 3,
      assignment_notification: AssignmentNotification.NOT_ASSIGNED,
      scheduled_assignment_date: null,
      isFreeForAll: Boolean((lesson as any).isFreeForAll),
      assignment_image_url: lesson.assignment_image_url || null,
      markdown: lesson.newsArticleConfig?.markdown || '',
      maxWordTaps: lesson.newsArticleConfig?.maxWordTaps ?? null,
    });
  }, [lesson]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    const file = event.target.files?.[0];
    if (!file) {
      toast.error('No file selected.');
      return;
    }
    setIsUploading(true);
    try {
      const response = await fetch(`/api/upload?filename=${file.name}`, {
        method: 'POST',
        body: file,
      });
      if (!response.ok) {
        const errorData = await safeJson(response);
        throw new Error(errorData?.error || 'Upload failed.');
      }
      const data = await safeJson(response);
      if (!data?.url) {
        throw new Error('Upload succeeded but URL is missing.');
      }
      setAssignmentImageUrl(data.url);
      toast.success('Image uploaded.');
    } catch (error) {
      toast.error((error as Error).message || 'Unable to upload image.');
    } finally {
      setIsUploading(false);
    }
  };

  const validate = () => {
    if (!title.trim() || !lessonPreview.trim()) {
      toast.error('Title and lesson preview are required.');
      return false;
    }
    if (!markdown.trim()) {
      toast.error('Please add the article markdown.');
      return false;
    }
    return true;
  };

  const buildPayload = useCallback(() => {
    const parsedMax = Number(maxWordTaps);
    const normalizedMax =
      Number.isFinite(parsedMax) && parsedMax > 0 ? Math.floor(parsedMax) : null;
    return {
      title: title.trim(),
      lesson_preview: lessonPreview.trim(),
      assignment_text: assignmentText.trim() || null,
      notes: notes.trim() || null,
      price: Number(price) || 0,
      difficulty,
      assignment_notification: AssignmentNotification.NOT_ASSIGNED,
      scheduled_assignment_date: null,
      isFreeForAll,
      assignment_image_url: assignmentImageUrl,
      markdown: markdown.trim(),
      maxWordTaps: normalizedMax,
    };
  }, [
    assignmentImageUrl,
    assignmentText,
    difficulty,
    isFreeForAll,
    lessonPreview,
    markdown,
    maxWordTaps,
    notes,
    price,
    title,
  ]);

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const url = isEditMode ? `/api/lessons/news-article/${lesson?.id}` : '/api/lessons/news-article';
      const method = isEditMode ? 'PATCH' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      });
      if (!response.ok) {
        const errorData = await safeJson(response);
        throw new Error(errorData?.error || 'Unable to save lesson.');
      }
      const saved = await safeJson(response);
      lastSavedRef.current = payloadString;
      toast.success(isEditMode ? 'Lesson updated.' : 'Lesson created.');
      if (!isEditMode && saved?.id) {
        router.push(`/dashboard/edit/news-article/${saved.id}`);
        router.refresh();
      } else {
        router.refresh();
      }
    } catch (error) {
      toast.error((error as Error).message || 'Unable to save lesson.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const payloadString = useMemo(() => JSON.stringify(buildPayload()), [buildPayload]);
  const canAutoSave = useMemo(() => {
    if (!title.trim() || !lessonPreview.trim() || !markdown.trim()) return false;
    if (!isEditMode) return false;
    return payloadString !== lastSavedRef.current;
  }, [isEditMode, lessonPreview, markdown, payloadString, title]);

  const handleAutoSave = useCallback(async () => {
    if (!lesson?.id) return false;
    try {
      const response = await fetch(`/api/lessons/news-article/${lesson.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      });
      if (response.ok) {
        lastSavedRef.current = payloadString;
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [lesson?.id, buildPayload, payloadString]);

  const { status, lastSavedAt } = useLessonAutosave({
    enabled: autoSaveEnabled,
    isEditMode,
    canSave: canAutoSave,
    isSavingBlocked: isSubmitting,
    onSave: handleAutoSave,
    dependencies: [
      title,
      lessonPreview,
      markdown,
      maxWordTaps,
      price,
      difficulty,
      assignmentText,
      notes,
      assignmentImageUrl,
      isFreeForAll,
    ],
    resetKey: lesson?.id ?? null,
  });

  return (
    <div className="space-y-6">
      <div className="form-field">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          placeholder="Enter lesson title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isSubmitting}
          required
        />
      </div>

      <div className="form-field">
        <Label htmlFor="lessonPreview">Lesson Preview</Label>
        <Textarea
          id="lessonPreview"
          placeholder="A brief preview of the lesson for students."
          value={lessonPreview}
          onChange={(e) => setLessonPreview(e.target.value)}
          disabled={isSubmitting}
          required
        />
      </div>

      <div className="form-field">
        <div className="flex items-center">
          <Label htmlFor="articleMarkdown">Article (Markdown)</Label>
          <OptionalIndicator />
        </div>
        <Textarea
          id="articleMarkdown"
          placeholder="Paste the news article in markdown..."
          value={markdown}
          onChange={(e) => setMarkdown(e.target.value)}
          disabled={isSubmitting}
          rows={12}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="form-field">
          <Label htmlFor="maxWordTaps">Max word taps (optional)</Label>
          <Input
            id="maxWordTaps"
            type="number"
            min="1"
            placeholder="Unlimited"
            value={maxWordTaps}
            onChange={(e) => setMaxWordTaps(e.target.value)}
            disabled={isSubmitting}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Leave blank to allow unlimited taps.
          </p>
        </div>
        <div className="form-field">
          <Label htmlFor="price">Price (€)</Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            disabled={isSubmitting}
          />
        </div>
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

      <LessonDifficultySelector value={difficulty} onChange={setDifficulty} disabled={isSubmitting} />

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
            disabled={isSubmitting || isUploading}
            accept="image/*"
            className="flex-grow"
          />
          <ImageBrowser onSelectImage={setAssignmentImageUrl} />
        </div>
        {isUploading && <p className="text-sm text-muted-foreground">Uploading...</p>}
        {assignmentImageUrl && (
          <Image
            src={assignmentImageUrl}
            alt="Uploaded preview"
            width={500}
            height={300}
            className="mt-4 h-auto w-full rounded-md border"
          />
        )}
      </div>

      <div className="form-field">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Label htmlFor="assignmentText">Instructions</Label>
            <OptionalIndicator />
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
          placeholder="Optional instructions for students."
          value={assignmentText}
          onChange={(e) => setAssignmentText(e.target.value)}
          disabled={isSubmitting}
        />
      </div>

      <div className="form-field">
        <div className="flex items-center gap-2">
          <Label htmlFor="notes">Teacher Notes</Label>
          <OptionalIndicator />
        </div>
        <Textarea
          id="notes"
          placeholder="Optional notes for students."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={isSubmitting}
        />
      </div>

      {isEditMode && autoSaveEnabled && (
        <p className="text-xs text-muted-foreground">
          {formatAutoSaveStatus(status, lastSavedAt)}
        </p>
      )}

      <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Upload className="mr-2 h-4 w-4 animate-spin" /> Saving...
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" /> {isEditMode ? 'Save changes' : 'Create lesson'}
          </>
        )}
      </Button>
    </div>
  );
}
