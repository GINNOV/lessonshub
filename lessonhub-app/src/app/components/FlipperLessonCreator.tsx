'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Info, Trash2, Upload } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { formatAutoSaveStatus, useLessonAutosave } from '@/app/components/useLessonAutosave';

const TILE_COUNT = 12;
const MIN_PENALTY_THRESHOLD = 3;

type FlipperTileState = {
  id: string;
  imageUrl: string | null;
  word: string;
};

type SerializableLesson = Omit<Lesson, 'price'> & {
  price: number;
  flipperConfig?: {
    attemptsBeforePenalty: number | null;
  } | null;
  flipperTiles?: Array<{ id: string; imageUrl: string; word: string }>;
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

interface FlipperLessonCreatorProps {
  lesson?: SerializableLesson | null;
  teacherPreferences?: TeacherPreferences | null;
  instructionBooklets?: InstructionBooklet[];
}

const createTile = (imageUrl: string | null = null): FlipperTileState => ({
  id:
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  imageUrl,
  word: '',
});

export default function FlipperLessonCreator({
  lesson,
  teacherPreferences,
  instructionBooklets = [],
}: FlipperLessonCreatorProps) {
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
  const [difficulty, setDifficulty] = useState<number>(lesson?.difficulty ?? 3);
  const [assignmentImageUrl, setAssignmentImageUrl] = useState<string | null>(null);
  const [isFreeForAll, setIsFreeForAll] = useState<boolean>(lesson?.isFreeForAll ?? false);
  const [tiles, setTiles] = useState<FlipperTileState[]>([]);
  const [attemptsBeforePenalty, setAttemptsBeforePenalty] = useState('3');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

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
    setIsFreeForAll(Boolean((lesson as any).isFreeForAll));
    setAttemptsBeforePenalty(String(lesson.flipperConfig?.attemptsBeforePenalty ?? 3));
    if (Array.isArray(lesson.flipperTiles) && lesson.flipperTiles.length) {
      setTiles(
        lesson.flipperTiles.map((tile) => ({
          id: tile.id,
          imageUrl: tile.imageUrl,
          word: tile.word,
        })),
      );
    }
  }, [lesson]);

  const OptionalIndicator = () => <Info className="ml-1 h-4 w-4 text-muted-foreground" />;

  const handleAssignmentImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const response = await fetch(`/api/upload?filename=${file.name}`, { method: 'POST', body: file });
      if (!response.ok) throw new Error('Upload failed.');
      const newBlob = await response.json();
      setAssignmentImageUrl(newBlob.url);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleTilesUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    const remainingSlots = TILE_COUNT - tiles.length;
    if (remainingSlots <= 0) {
      toast.error(`You already have ${TILE_COUNT} tiles.`);
      return;
    }

    const uploads = files.slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      toast.success(`Only the first ${remainingSlots} files will be used.`);
    }

    setIsUploading(true);
    try {
      const uploaded: FlipperTileState[] = [];
      for (const file of uploads) {
        const response = await fetch(`/api/upload?filename=${file.name}`, { method: 'POST', body: file });
        if (!response.ok) throw new Error('Upload failed.');
        const newBlob = await response.json();
        uploaded.push(createTile(newBlob.url));
      }
      setTiles((prev) => [...prev, ...uploaded]);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleTileReplace = async (event: React.ChangeEvent<HTMLInputElement>, tileId: string) => {
    event.preventDefault();
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const response = await fetch(`/api/upload?filename=${file.name}`, { method: 'POST', body: file });
      if (!response.ok) throw new Error('Upload failed.');
      const newBlob = await response.json();
      setTiles((prev) =>
        prev.map((tile) => (tile.id === tileId ? { ...tile, imageUrl: newBlob.url } : tile)),
      );
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsUploading(false);
    }
  };

  const removeTile = (tileId: string) => {
    setTiles((prev) => prev.filter((tile) => tile.id !== tileId));
  };

  const updateTileWord = (tileId: string, value: string) => {
    setTiles((prev) => prev.map((tile) => (tile.id === tileId ? { ...tile, word: value } : tile)));
  };

  const validate = () => {
    if (!title.trim()) {
      toast.error('Please add a lesson title.');
      return false;
    }
    if (!lessonPreview.trim()) {
      toast.error('Please add a lesson preview.');
      return false;
    }
    const attemptsValue = Number(attemptsBeforePenalty);
    if (!Number.isInteger(attemptsValue) || attemptsValue < MIN_PENALTY_THRESHOLD) {
      toast.error('Penalty threshold must be 3 or greater.');
      return false;
    }
    if (tiles.length !== TILE_COUNT) {
      toast.error(`Upload exactly ${TILE_COUNT} tiles.`);
      return false;
    }
    const missing = tiles.find((tile) => !tile.imageUrl || !tile.word.trim());
    if (missing) {
      toast.error('Every tile needs an image and a matching word.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    const url = isEditMode ? `/api/lessons/flipper/${lesson?.id}` : '/api/lessons/flipper';
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
          price: parseFloat(price) || 0,
          difficulty,
          assignment_image_url: assignmentImageUrl,
          isFreeForAll,
          tiles: tiles.map((tile) => ({
            imageUrl: tile.imageUrl,
            word: tile.word,
          })),
          attemptsBeforePenalty: Number(attemptsBeforePenalty),
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Failed to save Flipper lesson.');
      }
      toast.success('Flipper lesson saved successfully!');
      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canAutoSave = useMemo(() => {
    const attemptsValue = Number(attemptsBeforePenalty);
    const hasValidConfig = Number.isInteger(attemptsValue) && attemptsValue >= MIN_PENALTY_THRESHOLD;
    const hasTiles =
      tiles.length === TILE_COUNT && tiles.every((tile) => tile.imageUrl && tile.word.trim());
    return (
      isEditMode &&
      title.trim().length > 0 &&
      lessonPreview.trim().length > 0 &&
      Number.isInteger(difficulty) &&
      difficulty >= 1 &&
      difficulty <= 5 &&
      hasTiles &&
      hasValidConfig
    );
  }, [attemptsBeforePenalty, difficulty, isEditMode, lessonPreview, title, tiles]);

  const handleAutoSave = useCallback(async () => {
    if (!lesson) return false;
    const response = await fetch(`/api/lessons/flipper/${lesson.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        lesson_preview: lessonPreview,
        assignment_text: assignmentText,
        context_text: contextText,
        notes,
        price: parseFloat(price) || 0,
        difficulty,
        assignment_image_url: assignmentImageUrl,
        isFreeForAll,
        tiles: tiles.map((tile) => ({
          imageUrl: tile.imageUrl,
          word: tile.word,
        })),
        attemptsBeforePenalty: Number(attemptsBeforePenalty),
      }),
    });
    return response.ok;
  }, [
    assignmentImageUrl,
    assignmentText,
    attemptsBeforePenalty,
    contextText,
    difficulty,
    isFreeForAll,
    lesson,
    lessonPreview,
    notes,
    price,
    tiles,
    title,
  ]);

  const { status: autoSaveStatus, lastSavedAt } = useLessonAutosave({
    enabled: autoSaveEnabled,
    isEditMode,
    canSave: canAutoSave,
    isSavingBlocked: isSubmitting || isUploading,
    onSave: handleAutoSave,
    dependencies: [
      title,
      lessonPreview,
      price,
      assignmentText,
      contextText,
      notes,
      tiles,
      attemptsBeforePenalty,
      difficulty,
      assignmentImageUrl,
      isFreeForAll,
    ],
    resetKey: lesson?.id ?? null,
  });
  const autoSaveMessage = formatAutoSaveStatus(autoSaveStatus, lastSavedAt);

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-6">
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
        <Input
          id="price"
          type="number"
          step="0.01"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          disabled={isSubmitting}
        />
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const selected = instructionBooklets.find((booklet) => booklet.id === selectedBookletId);
                if (selected) {
                  setAssignmentText((prev) => `${prev}\n${selected.body}`);
                  setSelectedBookletId('');
                }
              }}
              disabled={!selectedBookletId}
            >
              Insert
            </Button>
          </div>
        )}
        <Textarea
          id="assignmentText"
          value={assignmentText}
          onChange={(event) => setAssignmentText(event.target.value)}
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="contextText">
          Additional Information <OptionalIndicator />
        </Label>
        <Textarea
          id="contextText"
          value={contextText}
          onChange={(event) => setContextText(event.target.value)}
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">
          Notes <OptionalIndicator />
        </Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="attemptsBeforePenalty">Attempts before penalty</Label>
        <Input
          id="attemptsBeforePenalty"
          type="number"
          min={MIN_PENALTY_THRESHOLD}
          value={attemptsBeforePenalty}
          onChange={(event) => setAttemptsBeforePenalty(event.target.value)}
          disabled={isSubmitting}
        />
        <p className="text-xs text-muted-foreground">
          Attempts 1-3 earn €10, €5, and €1. After that, each extra attempt deducts €5.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Lesson Cover Image <OptionalIndicator /></Label>
        <div className="flex flex-col gap-2">
          <FileUploadButton
            label={isUploading ? 'Uploading...' : 'Upload cover image'}
            accept="image/*"
            onChange={handleAssignmentImageUpload}
            disabled={isSubmitting || isUploading}
            allowClear={Boolean(assignmentImageUrl)}
            clearLabel="Remove"
          />
          {assignmentImageUrl && (
            <img
              src={assignmentImageUrl}
              alt="Lesson cover"
              className="h-36 w-full rounded-xl object-cover"
            />
          )}
          <ImageBrowser onSelectImage={setAssignmentImageUrl} />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Flipper tiles</h2>
            <p className="text-xs text-muted-foreground">Upload exactly {TILE_COUNT} tiles and set a matching word for each.</p>
          </div>
          <FileUploadButton
            label={isUploading ? 'Uploading...' : 'Upload tiles'}
            accept="image/*"
            multiple
            appearance="button"
            buttonVariant="outline"
            buttonSize="sm"
            onChange={handleTilesUpload}
            disabled={isSubmitting || isUploading}
          />
        </div>

        {tiles.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-6 text-center text-sm text-slate-300">
            Upload {TILE_COUNT} images to get started.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tiles.map((tile, index) => (
              <div key={tile.id} className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Tile {index + 1}</p>
                  <button
                    type="button"
                    onClick={() => removeTile(tile.id)}
                    className="text-slate-400 transition hover:text-rose-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 flex flex-col gap-3">
                  <div className="relative">
                    {tile.imageUrl ? (
                      <img
                        src={tile.imageUrl}
                        alt={`Tile ${index + 1}`}
                        className="h-32 w-full rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-700 text-xs text-slate-400">
                        <Upload className="mr-2 h-4 w-4" />
                        Upload image
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <FileUploadButton
                      label="Replace"
                      accept="image/*"
                      appearance="button"
                      buttonVariant="secondary"
                      buttonSize="sm"
                      onChange={(event) => handleTileReplace(event, tile.id)}
                      disabled={isSubmitting || isUploading}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`tile-word-${tile.id}`}>Word</Label>
                    <Input
                      id={`tile-word-${tile.id}`}
                      value={tile.word}
                      onChange={(event) => updateTileWord(tile.id, event.target.value)}
                      placeholder="Enter the matching word"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isEditMode && (
        <div className="text-xs text-muted-foreground">
          {autoSaveMessage}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isSubmitting || isUploading}>
          {isSubmitting ? 'Saving...' : 'Save Lesson'}
        </Button>
        <p className="text-xs text-muted-foreground">All tiles must be uploaded before saving.</p>
      </div>
    </form>
  );
}
