'use client';

import { useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Lesson, AssignmentNotification } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LessonDifficultySelector } from '@/app/components/LessonDifficultySelector';
import { toast } from 'sonner';
import { parseCsv } from '@/lib/csv';
import LearningSessionPlayer from '@/app/components/LearningSessionPlayer';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import Image from 'next/image';
import { guideImageOptions } from '@/lib/guideImages';
import FileUploadButton from '@/components/FileUploadButton';
import { Download } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useSession } from 'next-auth/react';
import { formatAutoSaveStatus, useLessonAutosave } from '@/app/components/useLessonAutosave';

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

type LessonWithCards = Omit<Lesson, 'price'> & {
  price: number;
  isFreeForAll?: boolean;
  guideCardImage?: string | null;
  learningSessionCards: {
    id: string;
    orderIndex: number;
    content1: string;
    content2: string;
    content3: string | null;
    content4: string | null;
    extra: string | null;
  }[];
};

type LearningSessionCardState = {
  content1: string;
  content2: string;
  content3: string;
  content4: string;
  extra: string;
};

interface LearningSessionCreatorProps {
  lesson?: LessonWithCards | null;
  teacherPreferences?: TeacherPreferences | null;
  instructionBooklets?: InstructionBooklet[];
}

const createEmptyCard = (): LearningSessionCardState => ({
  content1: '',
  content2: '',
  content3: '',
  content4: '',
  extra: '',
});

const parseLearningSessionCsv = (content: string): LearningSessionCardState[] => {
  const rows = parseCsv(content);
  if (rows.length === 0) return [];

  const headers = rows[0].map((header) => header.trim().toLowerCase());
  const c1Index = headers.indexOf('content1');
  const c2Index = headers.indexOf('content2');
  const c3Index = headers.indexOf('content3');
  const c4Index = headers.indexOf('content4');
  const extraIndex = headers.indexOf('extra');

  if (c1Index === -1 || c2Index === -1) {
    throw new Error('CSV must include at least "content1" and "content2" headers.');
  }

  return rows.slice(1).reduce<LearningSessionCardState[]>((acc, row) => {
    const content1 = row[c1Index]?.trim() ?? '';
    const content2 = row[c2Index]?.trim() ?? '';
    const content3 = c3Index >= 0 ? row[c3Index]?.trim() ?? '' : '';
    const content4 = c4Index >= 0 ? row[c4Index]?.trim() ?? '' : '';
    const extra = extraIndex >= 0 ? row[extraIndex]?.trim() ?? '' : '';

    if (!content1 && !content2 && !content3 && !content4 && !extra) {
      return acc;
    }

    acc.push({
      content1,
      content2,
      content3,
      content4,
      extra,
    });
    return acc;
  }, []);
};

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

export default function LearningSessionCreator({
  lesson,
  teacherPreferences,
  instructionBooklets = [],
}: LearningSessionCreatorProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const autoSaveEnabled = !((session?.user as any)?.lessonAutoSaveOptOut ?? false);
  const isEditMode = Boolean(lesson);

  const [title, setTitle] = useState(lesson?.title ?? '');
  const [price, setPrice] = useState(
    lesson ? lesson.price.toString() : teacherPreferences?.defaultLessonPrice?.toString() ?? '0'
  );
  const [lessonPreview, setLessonPreview] = useState(lesson?.lesson_preview ?? teacherPreferences?.defaultLessonPreview ?? '');
  const [assignmentText, setAssignmentText] = useState(
    lesson?.assignment_text ?? teacherPreferences?.defaultLessonInstructions ?? '👉🏼 INSTRUCTIONS:\n'
  );
  const [difficulty, setDifficulty] = useState<number>(lesson?.difficulty ?? 3);
  const [guideCardImage, setGuideCardImage] = useState<string>(
    lesson?.guideCardImage || guideImageOptions[0]?.value || '/my-guides/defaultcard.png'
  );
  const [cards, setCards] = useState<LearningSessionCardState[]>(
    lesson?.learningSessionCards?.length
      ? [...lesson.learningSessionCards]
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map((card) => ({
            content1: card.content1 ?? '',
            content2: card.content2 ?? '',
            content3: card.content3 ?? '',
            content4: card.content4 ?? '',
            extra: card.extra ?? '',
          }))
      : [createEmptyCard()]
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedBookletId, setSelectedBookletId] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [assignmentNotification, setAssignmentNotification] = useState<AssignmentNotification>(
    lesson?.assignment_notification ?? AssignmentNotification.NOT_ASSIGNED
  );
  const [scheduledDate, setScheduledDate] = useState(
    formatDateTimeLocal(lesson?.scheduled_assignment_date ?? null)
  );
  const [isFreeForAll, setIsFreeForAll] = useState<boolean>(lesson?.isFreeForAll ?? false);

  const downloadLearningSessionTemplate = () => {
    const headers = ['content1', 'content2', 'content3', 'content4', 'extra'];
    const sampleRows: LearningSessionCardState[] = [
      {
        content1: 'Introduce vowel cascade warm-up.',
        content2: 'Student mirrors immediately.',
        content3: 'Add metronome at 80bpm.',
        content4: 'Coach tall vowels and soft palate.',
        extra: 'Link: https://example.com/demo',
      },
      {
        content1: 'Chord progression call-and-response.',
        content2: 'Student sings roman numerals.',
        content3: 'Transpose up a whole step.',
        content4: 'Sustain tonic for 4 beats.',
        extra: 'Reminder: breathe every two bars.',
      },
    ];
    const dataRows = (cards.length ? cards : sampleRows).map((card) => [
      card.content1 ?? '',
      card.content2 ?? '',
      card.content3 ?? '',
      card.content4 ?? '',
      card.extra ?? '',
    ]);
    const rows = [headers, ...dataRows];
    const csv = rows
      .map((row) => row.map((value) => `"${(value ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'learning-session-template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const totalCards = cards.length;
  const validCards = useMemo(
    () => cards.filter((card) => card.content1.trim() && card.content2.trim()),
    [cards]
  );
  const previewableCards = useMemo(
    () =>
      cards.map((card, index) => ({
        id: `preview-${index}`,
        orderIndex: index,
        content1: card.content1,
        content2: card.content2,
        content3: card.content3,
        content4: card.content4,
        extra: card.extra,
      })),
    [cards]
  );

  const handleCardChange = (
    index: number,
    field: keyof LearningSessionCardState,
    value: string
  ) => {
    setCards((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addCard = () => setCards((prev) => [...prev, createEmptyCard()]);

  const removeCard = (index: number) => {
    if (cards.length === 1) {
      toast.error('At least one card is required.');
      return;
    }
    setCards((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCsvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const content = await file.text();
      const parsed = parseLearningSessionCsv(content);
      if (!parsed.length) {
        throw new Error('No rows detected in the CSV file.');
      }
      setCards(parsed);
      toast.success(`Loaded ${parsed.length} card${parsed.length === 1 ? '' : 's'} from CSV.`);
    } catch (error) {
      toast.error((error as Error).message || 'Unable to load CSV file.');
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      toast.error('Title is required.');
      return;
    }
    if (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > 5) {
      toast.error('Difficulty must be between 1 and 5.');
      return;
    }
    if (validCards.length === 0) {
      toast.error('Include at least one card with content1 and content2.');
      return;
    }

    let scheduledDatePayload: Date | null = null;
    if (assignmentNotification === AssignmentNotification.ASSIGN_ON_DATE) {
      if (!scheduledDate) {
        toast.error('Please select a date and time to schedule the assignment.');
        return;
      }
      const parsed = new Date(scheduledDate);
      if (Number.isNaN(parsed.getTime())) {
        toast.error('Please provide a valid date and time for the scheduled assignment.');
        return;
      }
      scheduledDatePayload = parsed;
    }

    setIsLoading(true);
    const endpoint = isEditMode
      ? `/api/lessons/learning-session/${lesson!.id}`
      : '/api/lessons/learning-session';
    const method = isEditMode ? 'PATCH' : 'POST';

    try {
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          price,
          lesson_preview: lessonPreview,
          assignment_text: assignmentText,
          difficulty,
          cards,
          guideCardImage,
          assignment_notification: assignmentNotification,
          scheduled_assignment_date: scheduledDatePayload,
          isFreeForAll,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save guide.');
      }

      toast.success(`Guide ${isEditMode ? 'updated' : 'created'} successfully.`);
      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const parseScheduledDate = (value: string) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const scheduledDatePayload =
    assignmentNotification === AssignmentNotification.ASSIGN_ON_DATE
      ? parseScheduledDate(scheduledDate)
      : null;

  const canAutoSave =
    isEditMode &&
    title.trim().length > 0 &&
    validCards.length > 0 &&
    Number.isInteger(difficulty) &&
    difficulty >= 1 &&
    difficulty <= 5 &&
    (assignmentNotification !== AssignmentNotification.ASSIGN_ON_DATE || Boolean(scheduledDatePayload));

  const handleAutoSave = useCallback(async () => {
    if (!lesson) return false;
    const response = await fetch(`/api/lessons/learning-session/${lesson.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        price,
        lesson_preview: lessonPreview,
        assignment_text: assignmentText,
        difficulty,
        cards,
        guideCardImage,
        assignment_notification: assignmentNotification,
        scheduled_assignment_date: scheduledDatePayload,
        isFreeForAll,
      }),
    });
    return response.ok;
  }, [
    assignmentNotification,
    assignmentText,
    cards,
    difficulty,
    guideCardImage,
    isFreeForAll,
    lesson,
    lessonPreview,
    price,
    scheduledDatePayload,
    title,
  ]);

  const autoSaveDependencies = useMemo(
    () => [
      title,
      price,
      lessonPreview,
      assignmentText,
      difficulty,
      cards,
      guideCardImage,
      assignmentNotification,
      scheduledDate,
      isFreeForAll,
    ],
    [
      title,
      price,
      lessonPreview,
      assignmentText,
      difficulty,
      cards,
      guideCardImage,
      assignmentNotification,
      scheduledDate,
      isFreeForAll,
    ]
  );

  const { status: autoSaveStatus, lastSavedAt } = useLessonAutosave({
    enabled: autoSaveEnabled,
    isEditMode,
    canSave: canAutoSave,
    isSavingBlocked: isLoading || isImporting,
    onSave: handleAutoSave,
    dependencies: autoSaveDependencies,
    resetKey: lesson?.id ?? null,
  });
  const autoSaveMessage = formatAutoSaveStatus(autoSaveStatus, lastSavedAt);

  const applyBooklet = (mode: 'replace' | 'append') => {
    const booklet = instructionBooklets.find((b) => b.id === selectedBookletId);
    if (!booklet) return;
    setAssignmentText((prev) =>
      mode === 'replace' ? booklet.body : `${prev.trim()}\n\n${booklet.body}`.trim()
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="form-field">
        <Label htmlFor="title">Lesson Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Mastering Conversation Starters"
        />
      </div>

      <div className="form-field">
        <Label htmlFor="price">Price (€)</Label>
        <Input
          id="price"
          type="number"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          disabled={isLoading}
        />
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
        <Textarea
          id="lessonPreview"
          placeholder="Give students a quick summary before they open the guide."
          value={lessonPreview}
          onChange={(e) => setLessonPreview(e.target.value)}
        />
      </div>

      <div className="form-field">
        <Label htmlFor="guideCardImage">Guide Card Image</Label>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
          <select
            id="guideCardImage"
            className="rounded-md border border-input bg-background text-foreground p-2 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={guideCardImage}
            onChange={(event) => setGuideCardImage(event.target.value)}
          >
            {guideImageOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="relative h-32 w-full overflow-hidden rounded-lg border sm:w-48">
            <Image
              src={guideCardImage}
              alt="Guide card preview"
              fill
              className="object-cover"
              sizes="192px"
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Add more card backgrounds under <code>/public/my-guides</code> to expand this list.
        </p>
      </div>

      <div className="form-field">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <Label htmlFor="assignmentText" className="text-base font-semibold">
            Instructions
          </Label>
          {instructionBooklets.length > 0 && (
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <select
                value={selectedBookletId}
                onChange={(e) => setSelectedBookletId(e.target.value)}
                className="rounded-md border border-input bg-background text-foreground p-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                  onClick={() => applyBooklet('replace')}
                >
                  Replace
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!selectedBookletId}
                  onClick={() => applyBooklet('append')}
                >
                  Append
                </Button>
              </div>
            </div>
          )}
        </div>
        <Textarea
          id="assignmentText"
          placeholder="Explain how students should use the guide."
          value={assignmentText}
          onChange={(e) => setAssignmentText(e.target.value)}
          rows={5}
        />
      </div>

      <div className="form-field">
        <Label htmlFor="assignmentNotification">Assignment Status</Label>
        <select
          id="assignmentNotification"
          value={assignmentNotification}
          onChange={(e) => setAssignmentNotification(e.target.value as AssignmentNotification)}
          disabled={isLoading}
          className="w-full rounded-md border border-input bg-background text-foreground p-2 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div className="w-full space-y-1">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="learningSessionCsv">Import guide CSV</Label>
              <Button type="button" variant="ghost" size="sm" onClick={downloadLearningSessionTemplate} className="text-xs font-semibold">
                <Download className="mr-2 h-4 w-4" />
                Download template
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Columns: content1, content2, content3, content4, extra (optional).
            </p>
          </div>
          <FileUploadButton
            id="learningSessionCsv"
            accept=".csv,text/csv"
            onChange={handleCsvUpload}
            disabled={isLoading || isImporting}
            className="md:w-72"
          />
        </div>
        {isImporting && <p className="text-sm text-muted-foreground">Parsing CSV…</p>}
      </div>

      <div className="space-y-4">
        {cards.map((card, index) => (
          <div key={index} className="rounded-lg border border-border bg-card p-4 shadow-sm space-y-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <h3 className="font-semibold text-lg">Card {index + 1}</h3>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => removeCard(index)}
                disabled={cards.length === 1}
              >
                Remove
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="form-field">
                <Label>Content 1</Label>
                <Textarea
                  placeholder="Primary text (shown first)"
                  value={card.content1}
                  onChange={(e) => handleCardChange(index, 'content1', e.target.value)}
                />
              </div>
              <div className="form-field">
                <Label>Content 2</Label>
                <Textarea
                  placeholder="Secondary text (first flip)"
                  value={card.content2}
                  onChange={(e) => handleCardChange(index, 'content2', e.target.value)}
                />
              </div>
              <div className="form-field">
                <Label>Content 3</Label>
                <Textarea
                  placeholder="Optional blended step (shows with content 2 + TTS)"
                  value={card.content3}
                  onChange={(e) => handleCardChange(index, 'content3', e.target.value)}
                />
              </div>
              <div className="form-field">
                <Label>Content 4</Label>
                <Textarea
                  placeholder="Final flip content"
                  value={card.content4}
                  onChange={(e) => handleCardChange(index, 'content4', e.target.value)}
                />
              </div>
            </div>
            <div className="form-field">
              <Label>Extra (unused)</Label>
              <Textarea
                placeholder="Store future notes or metadata."
                value={card.extra}
                onChange={(e) => handleCardChange(index, 'extra', e.target.value)}
                rows={2}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={addCard}>
            Add Card
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsPreviewOpen(true)}
            disabled={previewableCards.length === 0}
          >
            Preview
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          {validCards.length} / {totalCards} cards ready
        </p>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving…' : isEditMode ? 'Update Guide' : 'Create Guide'}
        </Button>
      </div>
      {autoSaveEnabled && isEditMode && autoSaveMessage && (
        <p className="text-xs text-muted-foreground">{autoSaveMessage}</p>
      )}

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Preview guide</DialogTitle>
          </DialogHeader>
          {previewableCards.length > 0 ? (
            <LearningSessionPlayer cards={previewableCards} lessonTitle={title || 'Preview'} />
          ) : (
            <p className="text-sm text-muted-foreground">Add at least one card to preview the session.</p>
          )}
        </DialogContent>
      </Dialog>
    </form>
  );
}
