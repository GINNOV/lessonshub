'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lesson } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LessonDifficultySelector } from '@/app/components/LessonDifficultySelector';
import { toast } from 'sonner';
import { parseCsv } from '@/lib/csv';
import ManageInstructionBookletsLink from '@/app/components/ManageInstructionBookletsLink';
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

export default function LearningSessionCreator({
  lesson,
  teacherPreferences,
  instructionBooklets = [],
}: LearningSessionCreatorProps) {
  const router = useRouter();
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
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save learning session.');
      }

      toast.success(`Learning session ${isEditMode ? 'updated' : 'created'} successfully.`);
      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const applyBooklet = (mode: 'replace' | 'append') => {
    const booklet = instructionBooklets.find((b) => b.id === selectedBookletId);
    if (!booklet) return;
    setAssignmentText((prev) =>
      mode === 'replace' ? booklet.body : `${prev.trim()}\n\n${booklet.body}`.trim()
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Lesson Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Mastering Conversation Starters"
        />
      </div>

      <div className="space-y-2">
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

      <LessonDifficultySelector value={difficulty} onChange={setDifficulty} disabled={isLoading} />

      <div className="space-y-2">
        <Label htmlFor="lessonPreview">Lesson Preview</Label>
        <Textarea
          id="lessonPreview"
          placeholder="Give students a quick summary before they open the guide."
          value={lessonPreview}
          onChange={(e) => setLessonPreview(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="guideCardImage">Guide Card Image</Label>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
          <select
            id="guideCardImage"
            className="rounded-md border border-gray-300 p-2 shadow-sm"
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
        <p className="text-xs text-gray-500">
          Add more card backgrounds under <code>/public/my-guides</code> to expand this list.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <Label htmlFor="assignmentText" className="text-base font-semibold">
            Instructions
          </Label>
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
        <p className="text-xs text-gray-500">
          Need reusable sets? <ManageInstructionBookletsLink />
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <Label htmlFor="learningSessionCsv">Import learning session CSV</Label>
            <p className="text-xs text-gray-500">
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
        {isImporting && <p className="text-sm text-gray-500">Parsing CSV…</p>}
      </div>

      <div className="space-y-4">
        {cards.map((card, index) => (
          <div key={index} className="rounded-lg border p-4 shadow-sm space-y-4 bg-white">
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
              <div className="space-y-2">
                <Label>Content 1</Label>
                <Textarea
                  placeholder="Primary text (shown first)"
                  value={card.content1}
                  onChange={(e) => handleCardChange(index, 'content1', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Content 2</Label>
                <Textarea
                  placeholder="Secondary text (first flip)"
                  value={card.content2}
                  onChange={(e) => handleCardChange(index, 'content2', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Content 3</Label>
                <Textarea
                  placeholder="Optional blended step (shows with content 2 + TTS)"
                  value={card.content3}
                  onChange={(e) => handleCardChange(index, 'content3', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Content 4</Label>
                <Textarea
                  placeholder="Final flip content"
                  value={card.content4}
                  onChange={(e) => handleCardChange(index, 'content4', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
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
        <p className="text-sm text-gray-500">
          {validCards.length} / {totalCards} cards ready
        </p>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving…' : isEditMode ? 'Update Learning Session' : 'Create Learning Session'}
        </Button>
      </div>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Preview learning session</DialogTitle>
          </DialogHeader>
          {previewableCards.length > 0 ? (
            <LearningSessionPlayer cards={previewableCards} lessonTitle={title || 'Preview'} />
          ) : (
            <p className="text-sm text-gray-500">Add at least one card to preview the session.</p>
          )}
        </DialogContent>
      </Dialog>
    </form>
  );
}
