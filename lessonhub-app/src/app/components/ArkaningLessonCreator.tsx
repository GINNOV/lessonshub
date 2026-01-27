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
import { parseCsv } from '@/lib/csv';
import { Download, Info, Trash2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { formatAutoSaveStatus, useLessonAutosave } from '@/app/components/useLessonAutosave';

type AnswerChoice = 'ing' | 'not-ing';

type ArkaningQuestion = {
  id: string;
  prompt: string;
  answer: AnswerChoice;
  reveal: string;
};

type SerializableLesson = Omit<Lesson, 'price'> & {
  price: number;
  arkaningConfig?: {
    questionBank: ArkaningQuestion[];
    roundsPerCorrect: number;
    pointsPerCorrect: number;
    eurosPerCorrect: number;
    lives: number;
    loseLifeOnWrong: boolean;
    wrongsPerLife: number;
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

interface ArkaningLessonCreatorProps {
  lesson?: SerializableLesson | null;
  teacherPreferences?: TeacherPreferences | null;
  instructionBooklets?: InstructionBooklet[];
}

const createEmptyQuestion = (): ArkaningQuestion => ({
  id:
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  prompt: '',
  answer: 'ing',
  reveal: '',
});

const normalizeAnswer = (value: string) => {
  const raw = value.trim().toLowerCase();
  if (raw === 'ing' || raw === '-ing') return 'ing';
  if (raw === 'not-ing' || raw === 'not ing') return 'not-ing';
  return null;
};

const downloadTemplate = (rows: ArkaningQuestion[]) => {
  const header = ['prompt', 'answer', 'reveal'];
  const csv = [
    header.join(','),
    ...rows.map((row) => [row.prompt, row.answer, row.reveal].map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'arkaning-questions-template.csv';
  link.click();
  URL.revokeObjectURL(link.href);
};

export default function ArkaningLessonCreator({
  lesson,
  teacherPreferences,
  instructionBooklets = [],
}: ArkaningLessonCreatorProps) {
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
  const [questions, setQuestions] = useState<ArkaningQuestion[]>([createEmptyQuestion()]);
  const [roundsPerCorrect, setRoundsPerCorrect] = useState('3');
  const [pointsPerCorrect, setPointsPerCorrect] = useState('10');
  const [eurosPerCorrect, setEurosPerCorrect] = useState('5');
  const [lives, setLives] = useState('5');
  const [loseLifeOnWrong, setLoseLifeOnWrong] = useState(true);
  const [wrongsPerLife, setWrongsPerLife] = useState('1');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

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
    if (lesson.arkaningConfig) {
      const config = lesson.arkaningConfig;
      setRoundsPerCorrect(String(config.roundsPerCorrect ?? 3));
      setPointsPerCorrect(String(config.pointsPerCorrect ?? 10));
      setEurosPerCorrect(String(config.eurosPerCorrect ?? 5));
      setLives(String(config.lives ?? 5));
      setLoseLifeOnWrong(Boolean(config.loseLifeOnWrong ?? true));
      setWrongsPerLife(String(config.wrongsPerLife ?? 1));
      setQuestions(
        Array.isArray(config.questionBank) && config.questionBank.length
          ? config.questionBank
          : [createEmptyQuestion()],
      );
    }
  }, [lesson]);

  const OptionalIndicator = () => <Info className="ml-1 h-4 w-4 text-muted-foreground" />;

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      createEmptyQuestion(),
    ]);
  };

  const removeQuestion = (id: string) => {
    setQuestions((prev) => (prev.length > 1 ? prev.filter((q) => q.id !== id) : prev));
  };

  const updateQuestion = (id: string, field: keyof ArkaningQuestion, value: string) => {
    setQuestions((prev) =>
      prev.map((question) => (question.id === id ? { ...question, [field]: value } : question)),
    );
  };

  const handleCsvImport = async (file: File) => {
    setIsImporting(true);
    try {
      const content = await file.text();
      const rows = parseCsv(content);
      if (rows.length < 2) throw new Error('CSV appears to be empty.');
      const headers = rows[0].map((cell) => cell.trim().toLowerCase());
      const promptIndex = headers.indexOf('prompt');
      const answerIndex = headers.indexOf('answer');
      const revealIndex = headers.indexOf('reveal');
      if (promptIndex === -1 || answerIndex === -1 || revealIndex === -1) {
        throw new Error('CSV header must include prompt, answer, and reveal.');
      }
      const parsed: ArkaningQuestion[] = rows.slice(1).map((row, index) => {
        const prompt = row[promptIndex]?.trim() ?? '';
        const rawAnswer = row[answerIndex]?.trim() ?? '';
        const answer = normalizeAnswer(rawAnswer);
        const reveal = row[revealIndex]?.trim() ?? '';
        if (rawAnswer && !answer) {
          throw new Error(`Row ${index + 2}: answer must be "ing" or "not-ing".`);
        }
        return {
          id: createEmptyQuestion().id,
          prompt,
          answer: (answer ?? 'ing') as AnswerChoice,
          reveal,
        };
      }).filter((row) => row.prompt || row.reveal);
      if (!parsed.length) {
        throw new Error('No questions found in the CSV file.');
      }
      setQuestions(parsed);
      toast.success(`Loaded ${parsed.length} question${parsed.length === 1 ? '' : 's'} from CSV.`);
    } catch (error) {
      toast.error((error as Error).message || 'Unable to load CSV file.');
    } finally {
      setIsImporting(false);
    }
  };

  const validate = () => {
    if (!title.trim() || !lessonPreview.trim()) {
      toast.error('Title and lesson preview are required.');
      return false;
    }
    if (questions.length === 0) {
      toast.error('Add at least one question.');
      return false;
    }
    for (const [index, question] of questions.entries()) {
      if (!question.prompt.trim() || !question.reveal.trim() || !question.answer.trim()) {
        toast.error(`Question ${index + 1} is missing fields.`);
        return false;
      }
      if (question.answer !== 'ing' && question.answer !== 'not-ing') {
        toast.error(`Question ${index + 1} answer must be "ing" or "not-ing".`);
        return false;
      }
    }
    const roundsValue = Number(roundsPerCorrect);
    if (!Number.isInteger(roundsValue) || roundsValue < 1) {
      toast.error('Rounds per correct must be a whole number greater than 0.');
      return false;
    }
    const pointsValue = Number(pointsPerCorrect);
    if (!Number.isInteger(pointsValue) || pointsValue < 0) {
      toast.error('Points per correct must be 0 or greater.');
      return false;
    }
    const eurosValue = Number(eurosPerCorrect);
    if (!Number.isFinite(eurosValue) || eurosValue < 0) {
      toast.error('Euros per correct must be 0 or greater.');
      return false;
    }
    const livesValue = Number(lives);
    if (!Number.isInteger(livesValue) || livesValue < 1) {
      toast.error('Lives must be a whole number greater than 0.');
      return false;
    }
    const wrongsValue = Number(wrongsPerLife);
    if (!loseLifeOnWrong && (!Number.isInteger(wrongsValue) || wrongsValue < 1)) {
      toast.error('Wrongs per life must be a whole number greater than 0.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    const url = isEditMode ? `/api/lessons/arkaning/${lesson?.id}` : '/api/lessons/arkaning';
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
          questions,
          roundsPerCorrect: Number(roundsPerCorrect),
          pointsPerCorrect: Number(pointsPerCorrect),
          eurosPerCorrect: Number(eurosPerCorrect),
          lives: Number(lives),
          loseLifeOnWrong,
          wrongsPerLife: Number(wrongsPerLife),
          price: parseFloat(price) || 0,
          difficulty,
          assignment_image_url: assignmentImageUrl,
          isFreeForAll,
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Failed to save ArkanING lesson.');
      }
      toast.success('ArkanING lesson saved successfully!');
      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canAutoSave = useMemo(() => {
    const hasQuestions = questions.length > 0 && questions.every((q) => q.prompt.trim() && q.reveal.trim());
    const roundsValue = Number(roundsPerCorrect);
    const livesValue = Number(lives);
    const pointsValue = Number(pointsPerCorrect);
    const eurosValue = Number(eurosPerCorrect);
    const wrongsValue = Number(wrongsPerLife);
    const hasValidConfig =
      Number.isInteger(roundsValue) &&
      roundsValue > 0 &&
      Number.isInteger(livesValue) &&
      livesValue > 0 &&
      Number.isInteger(pointsValue) &&
      pointsValue >= 0 &&
      Number.isFinite(eurosValue) &&
      eurosValue >= 0 &&
      (loseLifeOnWrong || (Number.isInteger(wrongsValue) && wrongsValue > 0));
    return (
      isEditMode &&
      title.trim().length > 0 &&
      lessonPreview.trim().length > 0 &&
      Number.isInteger(difficulty) &&
      difficulty >= 1 &&
      difficulty <= 5 &&
      hasQuestions &&
      hasValidConfig
    );
  }, [
    difficulty,
    eurosPerCorrect,
    isEditMode,
    lessonPreview,
    lives,
    loseLifeOnWrong,
    pointsPerCorrect,
    questions,
    roundsPerCorrect,
    title,
    wrongsPerLife,
  ]);

  const handleAutoSave = useCallback(async () => {
    if (!lesson) return false;
    const response = await fetch(`/api/lessons/arkaning/${lesson.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        lesson_preview: lessonPreview,
        assignment_text: assignmentText,
        context_text: contextText,
        notes,
        questions,
        roundsPerCorrect: Number(roundsPerCorrect),
        pointsPerCorrect: Number(pointsPerCorrect),
        eurosPerCorrect: Number(eurosPerCorrect),
        lives: Number(lives),
        loseLifeOnWrong,
        wrongsPerLife: Number(wrongsPerLife),
        price: parseFloat(price) || 0,
        difficulty,
        assignment_image_url: assignmentImageUrl,
        isFreeForAll,
      }),
    });
    return response.ok;
  }, [
    assignmentImageUrl,
    assignmentText,
    contextText,
    difficulty,
    eurosPerCorrect,
    isFreeForAll,
    lesson,
    lessonPreview,
    lives,
    loseLifeOnWrong,
    notes,
    pointsPerCorrect,
    price,
    questions,
    roundsPerCorrect,
    title,
    wrongsPerLife,
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
      questions,
      roundsPerCorrect,
      pointsPerCorrect,
      eurosPerCorrect,
      lives,
      loseLifeOnWrong,
      wrongsPerLife,
      difficulty,
      assignmentImageUrl,
      isFreeForAll,
    ],
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
        <Label>Game Settings</Label>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="roundsPerCorrect">Rounds per correct answer</Label>
            <Input
              id="roundsPerCorrect"
              type="number"
              min={1}
              value={roundsPerCorrect}
              onChange={(event) => setRoundsPerCorrect(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pointsPerCorrect">Points per correct</Label>
            <Input
              id="pointsPerCorrect"
              type="number"
              min={0}
              value={pointsPerCorrect}
              onChange={(event) => setPointsPerCorrect(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="eurosPerCorrect">Euros per correct</Label>
            <Input
              id="eurosPerCorrect"
              type="number"
              min={0}
              step="0.01"
              value={eurosPerCorrect}
              onChange={(event) => setEurosPerCorrect(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lives">Lives</Label>
            <Input
              id="lives"
              type="number"
              min={1}
              value={lives}
              onChange={(event) => setLives(event.target.value)}
            />
          </div>
        </div>
        <div className="mt-4 flex items-start justify-between rounded-lg border border-slate-800 bg-slate-900/50 p-4">
          <div>
            <p className="text-sm font-semibold">Lose a life on every wrong answer</p>
            <p className="text-xs text-muted-foreground">
              Turn off to deduct a life every N wrong answers instead.
            </p>
          </div>
          <Switch checked={loseLifeOnWrong} onCheckedChange={setLoseLifeOnWrong} />
        </div>
        {!loseLifeOnWrong && (
          <div className="mt-3 space-y-2">
            <Label htmlFor="wrongsPerLife">Wrong answers per life</Label>
            <Input
              id="wrongsPerLife"
              type="number"
              min={1}
              value={wrongsPerLife}
              onChange={(event) => setWrongsPerLife(event.target.value)}
            />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Questions</Label>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => downloadTemplate(questions)}>
            <Download className="mr-2 h-4 w-4" />
            Download CSV
          </Button>
          <FileUploadButton
            accept=".csv,text/csv"
            label="Upload CSV"
            className="inline-flex items-center gap-2"
            title="Import questions from CSV"
            clearLabel="Reupload"
            allowClear
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) handleCsvImport(file);
            }}
          />
          {isImporting && <span className="text-xs text-muted-foreground">Parsing CSV…</span>}
        </div>
        <p className="text-xs text-muted-foreground">CSV schema: prompt, answer, reveal (answer = ing or not-ing).</p>
      </div>

      <div className="space-y-4">
        {questions.map((question, index) => (
          <div key={question.id} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Question {index + 1}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeQuestion(question.id)}
                disabled={questions.length <= 1}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor={`prompt-${question.id}`}>Prompt</Label>
                <Input
                  id={`prompt-${question.id}`}
                  value={question.prompt}
                  onChange={(event) => updateQuestion(question.id, 'prompt', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`answer-${question.id}`}>Correct answer</Label>
                <select
                  id={`answer-${question.id}`}
                  value={question.answer}
                  onChange={(event) => updateQuestion(question.id, 'answer', event.target.value)}
                  className="w-full rounded-md border border-border bg-card/70 p-2 text-sm text-foreground shadow-sm"
                >
                  <option value="ing">Use -ing</option>
                  <option value="not-ing">Do not use -ing</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`reveal-${question.id}`}>Reveal text</Label>
                <Input
                  id={`reveal-${question.id}`}
                  value={question.reveal}
                  onChange={(event) => updateQuestion(question.id, 'reveal', event.target.value)}
                />
              </div>
            </div>
          </div>
        ))}
        <Button type="button" variant="outline" onClick={addQuestion}>
          Add Question
        </Button>
      </div>

      <div className="space-y-2">
        <Label>Cover Image <OptionalIndicator /></Label>
        <ImageBrowser onSelectImage={setAssignmentImageUrl} />
      </div>

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Attachment and audio fields are not used for ArkanING lessons.</p>
      </div>

      {autoSaveMessage && (
        <p className="text-xs text-muted-foreground">{autoSaveMessage}</p>
      )}

      <Button type="submit" disabled={isSubmitting || isUploading}>
        {isSubmitting ? 'Saving...' : 'Save Lesson'}
      </Button>
    </form>
  );
}
