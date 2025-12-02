// file: src/app/components/LyricLessonEditor.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lesson, LyricLessonConfig, AssignmentNotification } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { LessonDifficultySelector } from '@/app/components/LessonDifficultySelector';
import ManageInstructionBookletsLink from '@/app/components/ManageInstructionBookletsLink';
import { Music, Play, Pause, Scissors, Clock, RefreshCw, Upload, HelpCircle, Download, BookOpenText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';

type SerializableLesson = Omit<Lesson, 'price' | 'createdAt' | 'updatedAt'> & {
  price: number;
  isFreeForAll?: boolean;
  lyricConfig: (Omit<LyricLessonConfig, 'lines' | 'settings'> & {
    lines: LyricLine[];
    settings: LyricLessonSettings | null;
    lrcUrl: string | null;
    lrcStorageKey: string | null;
  }) | null;
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

export type LyricLine = {
  id: string;
  text: string;
  startTime: number | null;
  endTime: number | null;
  hiddenWords?: string[];
};

export type LyricLessonSettings = {
  defaultMode: 'read' | 'fill' | 'both';
  fillBlankDifficulty: number; // 0 - 1
  maxReadModeSwitches: number | null;
};

interface LyricLessonEditorProps {
  lesson?: SerializableLesson | null;
  teacherPreferences?: TeacherPreferences | null;
  instructionBooklets?: InstructionBooklet[];
}

type UploadState = 'idle' | 'uploading' | 'testing';
type LrcImportState = 'idle' | 'parsing' | 'uploading';

const OptionalIndicator = () => <span className="sr-only">Optional</span>;

const createLineId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `line_${Math.random().toString(36).slice(2, 10)}`;
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

const normalizeLines = (lines: unknown): LyricLine[] => {
  if (!Array.isArray(lines)) return [];
  const normalized: LyricLine[] = [];
  lines.forEach((line) => {
    if (!line || typeof line !== 'object') return;
    const record = line as Record<string, unknown>;
    const text = typeof record.text === 'string' ? record.text : '';
    if (!text.trim()) return;
    const id = typeof record.id === 'string' ? record.id : createLineId();
    const startTimeValue =
      typeof record.startTime === 'number'
        ? record.startTime
        : typeof record.startTime === 'string' && record.startTime.trim()
        ? Number(record.startTime)
        : null;
    const endTimeValue =
      typeof record.endTime === 'number'
        ? record.endTime
        : typeof record.endTime === 'string' && record.endTime.trim()
        ? Number(record.endTime)
        : null;
    const hiddenWords = Array.isArray(record.hiddenWords)
      ? record.hiddenWords.filter((word): word is string => typeof word === 'string' && word.trim().length > 0)
      : undefined;

    normalized.push({
      id,
      text,
      startTime: Number.isFinite(startTimeValue) ? Number(startTimeValue) : null,
      endTime: Number.isFinite(endTimeValue) ? Number(endTimeValue) : null,
      hiddenWords,
    });
  });
  return normalized;
};

const parseLrcContent = (content: string) => {
  const timestampRegex = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?]/g;
  const metadataRegex = /^\[(ti|ar|al|by|offset):/i;
  const entries: Array<{ start: number; text: string }> = [];
  const rawTextSegments: string[] = [];

  content.split(/\r?\n/).forEach((line) => {
    if (!line.trim()) return;
    if (metadataRegex.test(line.trim())) return;

    const matches = [...line.matchAll(timestampRegex)];
    const text = line.replace(timestampRegex, '').trim();

    if (matches.length === 0) {
      if (text) rawTextSegments.push(text);
      return;
    }

    matches.forEach((match) => {
      const [, minuteStr, secondStr, fractionStr] = match;
      const minutes = Number(minuteStr);
      const seconds = Number(secondStr);
      const fraction = fractionStr ? Number(fractionStr.padEnd(3, '0').slice(0, 3)) : 0;
      const start = minutes * 60 + seconds + fraction / 1000;
      if (!Number.isFinite(start)) return;

      entries.push({ start, text });
      if (text) rawTextSegments.push(text);
    });
  });

  entries.sort((a, b) => a.start - b.start);

  const lyricLines: LyricLine[] = entries
    .map((entry, index) => {
      const next = entries[index + 1];
      return {
        id: createLineId(),
        text: entry.text,
        startTime: entry.start,
        endTime: next ? next.start : null,
        hiddenWords: [],
      };
    })
    .filter(
      (line) => typeof line.text === 'string' && line.text.trim().length > 0
    );

  const rawCombined = rawTextSegments.filter(Boolean).join('\n');

  return {
    lines: lyricLines,
    raw: rawCombined,
  };
};

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch (error) {
    console.error('Failed to parse JSON', error);
    return null;
  }
}

const DEFAULT_SETTINGS: LyricLessonSettings = {
  defaultMode: 'read',
  fillBlankDifficulty: 0.2,
  maxReadModeSwitches: null,
};

const formatSeconds = (value: number | null) => {
  if (value === null || Number.isNaN(value)) return '--:--';
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  const millis = Math.floor((value % 1) * 1000);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${millis
    .toString()
    .padStart(3, '0')}`;
};

export default function LyricLessonEditor({
  lesson,
  teacherPreferences,
  instructionBooklets = [],
}: LyricLessonEditorProps) {
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [title, setTitle] = useState('');
  const [price, setPrice] = useState(teacherPreferences?.defaultLessonPrice?.toString() || '0');
  const [lessonPreview, setLessonPreview] = useState(teacherPreferences?.defaultLessonPreview || '');
  const [assignmentText, setAssignmentText] = useState(teacherPreferences?.defaultLessonInstructions || '👉🏼 INSTRUCTIONS:\n');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [recentAttachmentUrls, setRecentAttachmentUrls] = useState<string[]>([]);
  const [attachmentLinkStatus, setAttachmentLinkStatus] = useState<'idle' | 'testing' | 'valid' | 'invalid'>('idle');
  const [notes, setNotes] = useState(teacherPreferences?.defaultLessonNotes || '');
  const [difficulty, setDifficulty] = useState<number>(lesson?.difficulty ?? 3);
  const [selectedBookletId, setSelectedBookletId] = useState<string>('');
  const [assignmentNotification, setAssignmentNotification] = useState<AssignmentNotification>(
    lesson?.assignment_notification ?? AssignmentNotification.NOT_ASSIGNED
  );
  const [scheduledDate, setScheduledDate] = useState(
    formatDateTimeLocal(lesson?.scheduled_assignment_date ?? null)
  );

  const [audioUrl, setAudioUrl] = useState('');
  const [audioStorageKey, setAudioStorageKey] = useState<string | null>(null);
  const [lrcUrl, setLrcUrl] = useState('');
  const [lrcStorageKey, setLrcStorageKey] = useState<string | null>(null);
  const [audioUploadState, setAudioUploadState] = useState<UploadState>('idle');
  const [lrcImportState, setLrcImportState] = useState<LrcImportState>('idle');
  const [rawLyrics, setRawLyrics] = useState('');
  const [lines, setLines] = useState<LyricLine[]>([]);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [showAllLines, setShowAllLines] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [settings, setSettings] = useState<LyricLessonSettings>(DEFAULT_SETTINGS);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [manualEditingEnabled, setManualEditingEnabled] = useState<boolean>(() => !lesson?.lyricConfig?.lrcUrl);
  const [isFreeForAll, setIsFreeForAll] = useState<boolean>(lesson?.isFreeForAll ?? false);

  const isEditMode = !!lesson;
  const hasImportedLrc = Boolean(lrcUrl);

  useEffect(() => {
    if (!lesson) {
      setLines([]);
      setSelectedLineId(null);
      setShowAllLines(false);
      setAudioUrl('');
      setAudioStorageKey(null);
      setLrcUrl('');
      setLrcStorageKey(null);
      setRawLyrics('');
      setSettings(DEFAULT_SETTINGS);
      setManualEditingEnabled(true);
      setIsFreeForAll(false);
      setAttachmentUrl('');
      setAttachmentLinkStatus('idle');
      return;
    }

    setTitle(lesson.title);
    setPrice(lesson.price.toString());
    setLessonPreview(lesson.lesson_preview || '');
    setAssignmentText(lesson.assignment_text || '👉🏼 INSTRUCTIONS:\n');
    const lessonAttachment = lesson.attachment_url || '';
    setAttachmentUrl(lessonAttachment);
    setAttachmentLinkStatus(lessonAttachment ? 'valid' : 'idle');
    setNotes(lesson.notes || '');
    setAssignmentNotification(lesson.assignment_notification);
    setScheduledDate(formatDateTimeLocal(lesson.scheduled_assignment_date));
    setDifficulty(lesson.difficulty ?? 3);
    setIsFreeForAll(Boolean((lesson as any).isFreeForAll));

    if (lesson.lyricConfig) {
      const normalized = normalizeLines(lesson.lyricConfig.lines);
      setAudioUrl(lesson.lyricConfig.audioUrl);
      setAudioStorageKey(lesson.lyricConfig.audioStorageKey);
      setLrcUrl(lesson.lyricConfig.lrcUrl ?? '');
      setLrcStorageKey(lesson.lyricConfig.lrcStorageKey ?? null);
      setRawLyrics(lesson.lyricConfig.rawLyrics);
      setLines(normalized.length > 0 ? normalized : parseLyricsToLines(lesson.lyricConfig.rawLyrics));
      const initialLineId = normalized.length > 0 ? normalized[0].id : null;
      setSelectedLineId(initialLineId);
      const storedSettings = (lesson.lyricConfig.settings ?? {}) as Partial<LyricLessonSettings> & Record<string, unknown>;
      setSettings({
        ...DEFAULT_SETTINGS,
        ...storedSettings,
        maxReadModeSwitches:
          typeof storedSettings.maxReadModeSwitches === 'number' && Number.isFinite(storedSettings.maxReadModeSwitches)
            ? Math.max(0, Math.floor(storedSettings.maxReadModeSwitches))
            : null,
      });
      setManualEditingEnabled(!lesson.lyricConfig.lrcUrl);
      setShowAllLines(false);
    } else {
      setManualEditingEnabled(true);
      setShowAllLines(false);
    }
  }, [lesson]);

  useEffect(() => {
    if (selectedBookletId && !instructionBooklets.some(booklet => booklet.id === selectedBookletId)) {
      setSelectedBookletId('');
    }
  }, [instructionBooklets, selectedBookletId]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('recentAttachmentUrls');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setRecentAttachmentUrls(parsed.slice(0, 3));
        }
      }
    } catch (error) {
      console.error('Failed to load recent attachment URLs', error);
    }
  }, []);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const isModifier = event.metaKey || event.ctrlKey;
      if (!isModifier) return;
      if (event.shiftKey && (event.key === '?' || event.key === '/')) {
        event.preventDefault();
        setIsGuideOpen(true);
      }
    };

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  const rememberAttachmentUrl = (url: string) => {
    if (!url) return;
    setRecentAttachmentUrls((prev) => {
      const next = [url, ...prev.filter((item) => item !== url)].slice(0, 3);
      try {
        localStorage.setItem('recentAttachmentUrls', JSON.stringify(next));
      } catch (error) {
        console.error('Failed to persist recent attachment URLs', error);
      }
      return next;
    });
  };

  const applyInstructionBooklet = (mode: 'replace' | 'append') => {
    if (!selectedBookletId) return;
    const booklet = instructionBooklets.find((item) => item.id === selectedBookletId);
    if (!booklet) return;

    if (mode === 'replace') {
      setAssignmentText(booklet.body);
      return;
    }

    setAssignmentText((prev) => {
      const existing = (prev ?? '').trim();
      if (!existing) {
        return booklet.body;
      }
      return `${existing}\n\n${booklet.body}`.trim();
    });
  };

  const selectedLineIndex = useMemo(() => {
    if (!selectedLineId) return -1;
    return lines.findIndex((line) => line.id === selectedLineId);
  }, [lines, selectedLineId]);

  const selectedLine = selectedLineIndex >= 0 ? lines[selectedLineIndex] : null;

  function parseLyricsToLines(text: string): LyricLine[] {
    return text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => ({
        id: createLineId(),
        text: line,
        startTime: null,
        endTime: null,
        hiddenWords: [],
      }));
  }

  const regenerateLinesFromLyrics = () => {
    if (!rawLyrics.trim()) {
      toast.error('Add lyrics before generating lines.');
      return;
    }
    const generated = parseLyricsToLines(rawLyrics);
    if (generated.length === 0) {
      toast.error('No lyric lines detected.');
      return;
    }
    setLines(generated);
    setSelectedLineId(generated[0].id);
    setShowAllLines(false);
    toast.success(`Generated ${generated.length} lines from lyrics.`);
  };

  const handleAudioUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setAudioUploadState('uploading');
    try {
      const response = await fetch(`/api/upload?filename=${encodeURIComponent(file.name)}`, {
        method: 'POST',
        body: file,
      });

      if (!response.ok) {
        throw new Error('Failed to upload audio file.');
      }

      const data = await response.json();
      if (!data?.url) {
        throw new Error('Upload succeeded but no URL was returned.');
      }

      setAudioUrl(data.url);
      setAudioStorageKey(data.storageKey ?? null);
      toast.success('Audio uploaded successfully.');
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setAudioUploadState('idle');
      event.target.value = '';
    }
  };

  const handleLrcUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLrcImportState('parsing');
    try {
      const content = await file.text();
      const parsed = parseLrcContent(content);
      if (!parsed.lines.length) {
        throw new Error('No timecodes found in the provided LRC file.');
      }

      setLines(parsed.lines);
      const firstLineId = parsed.lines[0]?.id ?? null;
      setSelectedLineId(firstLineId);
      setShowAllLines(false);
      if (parsed.raw) {
        setRawLyrics(parsed.raw);
      } else {
        setRawLyrics(parsed.lines.map((line) => line.text).filter(Boolean).join('\n'));
      }

      setLrcImportState('uploading');
      const uploadResponse = await fetch(`/api/upload?filename=${encodeURIComponent(file.name)}`, {
        method: 'POST',
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload the LRC file.');
      }

      const uploaded = await uploadResponse.json();
      setLrcUrl(uploaded.url);
      setLrcStorageKey(uploaded.storageKey ?? null);
      setManualEditingEnabled(false);
      toast.success(`Imported ${parsed.lines.length} timed lines from LRC.`);
    } catch (error) {
      toast.error((error as Error).message || 'Unable to load LRC file.');
    } finally {
      setLrcImportState('idle');
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  useEffect(() => {
    if (lines.length === 0) {
      if (selectedLineId !== null) {
        setSelectedLineId(null);
      }
      return;
    }
    const exists = selectedLineId && lines.some((line) => line.id === selectedLineId);
    if (!exists) {
      setSelectedLineId(lines[0].id);
    }
  }, [lines, selectedLineId]);

  const updateLine = (lineId: string, updates: Partial<LyricLine>) => {
    setLines((prev) =>
      prev.map((line) => (line.id === lineId ? { ...line, ...updates } : line))
    );
  };

  const addLineAfter = (lineId: string) => {
    if (!manualEditingEnabled) return;
    const index = lines.findIndex((line) => line.id === lineId);
    const newLine: LyricLine = {
      id: createLineId(),
      text: '',
      startTime: null,
      endTime: null,
      hiddenWords: [],
    };

    if (index === -1) {
      setLines((prev) => [...prev, newLine]);
      setSelectedLineId(newLine.id);
      return;
    }

    const next = [...lines];
    next.splice(index + 1, 0, newLine);
    setLines(next);
    setSelectedLineId(newLine.id);
  };

  const removeLine = (lineId: string) => {
    if (!manualEditingEnabled) return;
    if (lines.length <= 1) {
      toast.error('A lyric lesson must contain at least one line.');
      return;
    }

    const next = lines.filter((line) => line.id !== lineId);
    setLines(next);
    if (selectedLineId === lineId) {
      const nextSelection = next[Math.min(selectedLineIndex, next.length - 1)];
      setSelectedLineId(nextSelection?.id ?? null);
    }
  };

  const shiftSelection = (direction: -1 | 1) => {
    if (selectedLineIndex === -1) return;
    const nextIndex = selectedLineIndex + direction;
    if (nextIndex < 0 || nextIndex >= lines.length) return;
    const nextLineId = lines[nextIndex].id;
    setSelectedLineId(nextLineId);
  };

  const captureCurrentTime = (target: 'startTime' | 'endTime') => {
    if (!manualEditingEnabled) return;
    const audio = audioRef.current;
    if (!audio) {
      toast.error('Load the audio preview before capturing timing.');
      return;
    }
    if (!selectedLine) {
      toast.error('Select a lyric line first.');
      return;
    }

    const current = audio.currentTime;
    const rounded = Math.round(current * 1000) / 1000;

    if (target === 'startTime') {
      updateLine(selectedLine.id, { startTime: rounded });
      // If end time exists and is before new start, clear it to avoid invalid range.
      if (selectedLine.endTime !== null && selectedLine.endTime < rounded) {
        updateLine(selectedLine.id, { endTime: null });
      }
    } else {
      if (selectedLine.startTime !== null && rounded < selectedLine.startTime) {
        toast.error('End time cannot be before start time.');
        return;
      }
      updateLine(selectedLine.id, { endTime: rounded });

      // Auto-populate next line start if empty
      const nextLine = lines[selectedLineIndex + 1];
      if (nextLine && (nextLine.startTime === null || nextLine.startTime < rounded)) {
        updateLine(nextLine.id, { startTime: rounded });
      }
    }
  };

  const playFromSelected = (mode: 'start' | 'current') => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!selectedLine) {
      audio.play();
      return;
    }

    if (mode === 'start' && selectedLine.startTime !== null) {
      audio.currentTime = selectedLine.startTime;
    }

    audio.play().catch(() => {
      toast.error('Unable to play audio. Please ensure it is loaded correctly.');
    });
  };

  const stopAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
  };

  const handleTestAttachmentLink = async () => {
    if (!attachmentUrl) return;
    setAttachmentLinkStatus('testing');
    try {
      const response = await fetch('/api/lessons/test-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: attachmentUrl }),
      });
      const data = await safeJson(response);
      const isValid = Boolean(data?.success);
      setAttachmentLinkStatus(isValid ? 'valid' : 'invalid');
      if (isValid) {
        rememberAttachmentUrl(attachmentUrl);
      }
    } catch (error) {
      console.error('Failed to test attachment link', error);
      setAttachmentLinkStatus('invalid');
    }
  };

  const syncLinesToLyrics = () => {
    const serialized = lines.map((line) => line.text).join('\n');
    setRawLyrics(serialized);
    toast.success('Lyric text synced from line editor.');
  };

  const validateBeforeSubmit = () => {
    if (!title.trim()) {
      toast.error('Add a lesson title before saving.', { id: 'lyric-title-missing' });
      document.getElementById('title')?.focus();
      return false;
    }

    const hasUploadedAudio = Boolean(audioUrl.trim());
    const isAttachmentAudio =
      typeof attachmentUrl === 'string' &&
      /\.(mp3|wav|ogg|m4a|aac)$/i.test(attachmentUrl.trim());
    const isSpotifyLink =
      typeof attachmentUrl === 'string' && /open\.spotify\.com/i.test(attachmentUrl.trim());
    if (!hasUploadedAudio && !isAttachmentAudio && !isSpotifyLink) {
      toast.error('Attach or upload an audio source before saving.', { id: 'lyric-audio-missing' });
      document.getElementById('audioUrl')?.focus();
      return false;
    }

    if (lines.length === 0) {
      toast.error('Add at least one lyric line.');
      return false;
    }

    if (lines.some((line) => !line.text.trim())) {
      toast.error('Lyric lines cannot be empty.');
      return false;
    }

    if (!rawLyrics.trim()) {
      toast.error('Raw lyrics field cannot be empty.');
      return false;
    }

    if (!difficulty || difficulty < 1 || difficulty > 5) {
      toast.error('Choose a difficulty between 1 and 5.');
      return false;
    }

    return true;
  };

  const serializeSettings = (): LyricLessonSettings => ({
    defaultMode: settings.defaultMode,
    fillBlankDifficulty: Math.min(0.8, Math.max(0.05, settings.fillBlankDifficulty)),
    maxReadModeSwitches:
      typeof settings.maxReadModeSwitches === 'number' && Number.isFinite(settings.maxReadModeSwitches)
        ? Math.max(0, Math.floor(settings.maxReadModeSwitches))
        : null,
  });

  const renderLineEditor = (line: LyricLine, index: number, showPerLineActions: boolean) => {
    const startDisplay = formatSeconds(line.startTime);
    const endDisplay = formatSeconds(line.endTime);
    const startInputId = `line-${line.id}-start`;
    const endInputId = `line-${line.id}-end`;

    return (
      <div
        className={[
          'rounded-md border bg-card/70 p-4 transition-shadow',
          selectedLineId === line.id ? 'border-primary/70 shadow-md' : 'border-border hover:shadow-sm',
        ].join(' ')}
        onClick={() => setSelectedLineId(line.id)}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide">
              Line {index + 1}
              {!showPerLineActions && lines.length > 0 ? ` of ${lines.length}` : ''}
            </p>
            <p className="text-xs text-muted-foreground">
              {startDisplay} → {endDisplay}
            </p>
          </div>
          {showPerLineActions && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => addLineAfter(line.id)}
                title="Insert line after"
                disabled={!manualEditingEnabled}
              >
                <Scissors className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeLine(line.id)}
                disabled={!manualEditingEnabled || lines.length <= 1}
                title="Remove line"
              >
                ✕
              </Button>
            </div>
          )}
        </div>

        <Textarea
          id={`line-${line.id}-text`}
          aria-label={`Lyric line ${index + 1}`}
          value={line.text}
          onFocus={() => setSelectedLineId(line.id)}
          onChange={(e) => updateLine(line.id, { text: e.target.value })}
          rows={3}
          placeholder="Lyric line"
          className="mt-3"
        />

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={startInputId} className="text-xs font-medium uppercase text-muted-foreground">
              Start Time (s)
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id={startInputId}
                name={startInputId}
                type="number"
                inputMode="decimal"
                step="0.01"
                value={line.startTime ?? ''}
                disabled={!manualEditingEnabled}
                onFocus={() => setSelectedLineId(line.id)}
                onChange={(e) =>
                  updateLine(line.id, {
                    startTime: e.target.value === '' ? null : Number(e.target.value),
                  })
                }
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!manualEditingEnabled}
                onClick={() => {
                  setSelectedLineId(line.id);
                  captureCurrentTime('startTime');
                }}
              >
                Mark Start
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={endInputId} className="text-xs font-medium uppercase text-muted-foreground">
              End Time (s)
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id={endInputId}
                name={endInputId}
                type="number"
                inputMode="decimal"
                step="0.01"
                value={line.endTime ?? ''}
                disabled={!manualEditingEnabled}
                onFocus={() => setSelectedLineId(line.id)}
                onChange={(e) =>
                  updateLine(line.id, {
                    endTime: e.target.value === '' ? null : Number(e.target.value),
                  })
                }
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!manualEditingEnabled}
                onClick={() => {
                  setSelectedLineId(line.id);
                  captureCurrentTime('endTime');
                }}
              >
                Mark End
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;
    if (!validateBeforeSubmit()) return;

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

    setIsSubmitting(true);
    try {
      const url = isEditMode ? `/api/lessons/lyric/${lesson!.id}` : '/api/lessons/lyric';
      const method = isEditMode ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          price: parseFloat(price) || 0,
          difficulty,
          lesson_preview: lessonPreview,
          assignment_text: assignmentText,
          attachment_url: attachmentUrl,
          notes,
          audioUrl,
          audioStorageKey,
          lrcUrl: lrcUrl.trim() || null,
          lrcStorageKey,
          rawLyrics,
          lines,
          settings: serializeSettings(),
          assignment_notification: assignmentNotification,
          scheduled_assignment_date: scheduledDatePayload,
          isFreeForAll,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const fallback = `Failed to save lyric lesson (status ${response.status}).`;
        const message = typeof errorData?.error === 'string' ? errorData.error : fallback;
        throw new Error(message);
      }

      toast.success(`Lyric lesson ${isEditMode ? 'updated' : 'created'} successfully!`);
      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="flex items-center justify-end">
          <Button
            type="button"
            variant="outline"
            className="inline-flex items-center gap-2"
            onClick={() => setIsGuideOpen(true)}
          >
            <HelpCircle className="h-4 w-4" />
            Teacher guide <span className="hidden sm:inline"> (Cmd&nbsp;+&nbsp;?)</span>
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Lesson Title</Label>
          <Input
            id="title"
            value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Perfect by Ed Sheeran — Chorus Practice"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="price">Price (€)</Label>
          <Input
            id="price"
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
        <LessonDifficultySelector value={difficulty} onChange={setDifficulty} />
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

      <div className="space-y-2">
        <Label htmlFor="lessonPreview">Lesson Preview</Label>
        <Textarea
          id="lessonPreview"
          rows={3}
          placeholder="Short preview for students."
          value={lessonPreview}
          onChange={(e) => setLessonPreview(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <Label htmlFor="assignmentText">Instructions</Label>
          {instructionBooklets.length > 0 && (
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <select
                value={selectedBookletId}
                onChange={(event) => setSelectedBookletId(event.target.value)}
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
                  onClick={() => applyInstructionBooklet('replace')}
                >
                  Replace
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!selectedBookletId}
                  onClick={() => applyInstructionBooklet('append')}
                >
                  Append
                </Button>
              </div>
            </div>
          )}
        </div>
        <Textarea
          id="assignmentText"
          rows={4}
          placeholder="Provide guidance for students."
          value={assignmentText}
          onChange={(e) => setAssignmentText(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Need reusable sets? <ManageInstructionBookletsLink />
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes for student</Label>
        <Textarea
          id="notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional context students should know before starting."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="assignmentNotification">Assignment Status</Label>
        <select
          id="assignmentNotification"
          value={assignmentNotification}
          onChange={(e) => setAssignmentNotification(e.target.value as AssignmentNotification)}
          disabled={isSubmitting}
          className="w-full rounded-md border border-border bg-card/70 p-2 text-foreground shadow-sm"
        >
          <option value={AssignmentNotification.NOT_ASSIGNED}>Save only</option>
          <option value={AssignmentNotification.ASSIGN_WITHOUT_NOTIFICATION}>Assign to All Students Now</option>
          <option value={AssignmentNotification.ASSIGN_AND_NOTIFY}>Assign to All and Notify Now</option>
          <option value={AssignmentNotification.ASSIGN_ON_DATE}>Assign on a Specific Date</option>
        </select>
      </div>

      {assignmentNotification === AssignmentNotification.ASSIGN_ON_DATE && (
        <div className="space-y-2">
          <Label htmlFor="scheduledDate">Scheduled Assignment Date &amp; Time</Label>
          <Input
            type="datetime-local"
            id="scheduledDate"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            disabled={isSubmitting}
            required
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="attachmentUrl">Reading Material</Label>
        <div className="flex items-center gap-2">
          <Input
            id="attachmentUrl"
            type="url"
            placeholder="https://example.com"
            value={attachmentUrl}
            onChange={(e) => {
              setAttachmentUrl(e.target.value);
              setAttachmentLinkStatus('idle');
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleTestAttachmentLink}
            disabled={!attachmentUrl || attachmentLinkStatus === 'testing'}
          >
            {attachmentLinkStatus === 'testing'
              ? 'Testing…'
              : attachmentLinkStatus === 'valid'
              ? 'Valid'
              : attachmentLinkStatus === 'invalid'
              ? 'Invalid'
              : 'Test link'}
          </Button>
        </div>
        {recentAttachmentUrls.length > 0 && (
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>Recent:</span>
            {recentAttachmentUrls.map((url) => {
              let hostname = url;
              try {
                hostname = new URL(url).hostname;
              } catch {
                // noop
              }
              return (
                <button
                  key={url}
                  type="button"
                  className="underline"
                  onClick={() => {
                    setAttachmentUrl(url);
                    setAttachmentLinkStatus('valid');
                    rememberAttachmentUrl(url);
                  }}
                >
                  {hostname}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="audioUrl">Audio Source</Label>
            <div className="flex gap-2">
              <Input
                id="audioUrl"
                placeholder="https://..."
                value={audioUrl}
                onChange={(e) => setAudioUrl(e.target.value)}
              />
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card/70 px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-card">
                <Upload className="h-4 w-4" />
                <span>{audioUploadState === 'uploading' ? 'Uploading…' : 'Upload'}</span>
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={handleAudioUpload}
                  disabled={audioUploadState === 'uploading'}
                />
              </label>
            </div>
            {audioUrl && (
              <div className="mt-3 flex items-center gap-3 rounded-md border border-border bg-card/60 p-3">
                <Music className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Preview</p>
                  <audio ref={audioRef} src={audioUrl} controls className="mt-2 w-full" preload="metadata" />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="lrcUpload">Timed Lyrics (.lrc)</Label>
              <OptionalIndicator />
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card/70 px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-card">
                <BookOpenText className="h-4 w-4" />
                <span>
                  {lrcImportState === 'parsing'
                    ? 'Parsing…'
                    : lrcImportState === 'uploading'
                    ? 'Uploading…'
                    : 'Upload LRC'}
                </span>
                <input
                  id="lrcUpload"
                  type="file"
                  accept=".lrc,text/plain"
                  className="hidden"
                  onChange={handleLrcUpload}
                  disabled={lrcImportState !== 'idle'}
                />
              </label>
              {lrcUrl && (
                <Button type="button" size="sm" variant="outline" asChild>
                  <a href={lrcUrl} target="_blank" rel="noopener noreferrer" download>
                    <Download className="mr-2 h-4 w-4" />
                    Download current LRC
                  </a>
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              We read the timestamps in the LRC file and apply them to the lyric lines. You can still fine-tune start or end
              times below.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {hasImportedLrc && (
            <div className="rounded-md border border-border bg-card/60 p-4 text-sm text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">Timed lyrics imported from LRC</p>
              <p>Playback now uses the timestamps from your file. Enable manual adjustments if you need to tweak timings by hand.</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setManualEditingEnabled((prev) => !prev)}
                >
                  {manualEditingEnabled ? 'Disable manual adjustments' : 'Enable manual adjustments'}
                </Button>
                {manualEditingEnabled && lrcUrl && (
                  <Button type="button" variant="outline" size="sm" asChild>
                    <a href={lrcUrl} target="_blank" rel="noopener noreferrer" download>
                      Download original LRC
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <Label htmlFor="rawLyrics">Lyric Text</Label>
          <Textarea
            id="rawLyrics"
            rows={12}
            placeholder="Paste the complete lyrics here..."
            value={rawLyrics}
            onChange={(e) => setRawLyrics(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            {manualEditingEnabled && (
              <Button type="button" variant="secondary" size="sm" onClick={regenerateLinesFromLyrics}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Generate Lines
              </Button>
            )}
            <Button type="button" variant="outline" size="sm" onClick={syncLinesToLyrics}>
              Sync from Editor
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {!hasImportedLrc && (
            <div className="rounded-md border border-border bg-card/60 p-4 space-y-3">
              <h3 className="text-sm font-semibold uppercase text-muted-foreground">Playback Controls</h3>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="default" size="sm" onClick={() => playFromSelected('start')}>
                  <Play className="mr-2 h-4 w-4" />
                  Play from line start
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => playFromSelected('current')}>
                  <Play className="mr-2 h-4 w-4" />
                  Resume
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={stopAudio}>
                  <Pause className="mr-2 h-4 w-4" />
                  Pause
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Select a line below, play the audio, then use <strong>Mark Start</strong> /
                <strong>Mark End</strong> to capture the current timestamp.
              </p>
            </div>
          )}

          <div className="rounded-md border border-border bg-card/60 p-4 space-y-3">
            <h3 className="text-sm font-semibold uppercase text-muted-foreground">Default Mode</h3>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={settings.defaultMode === 'read' ? 'default' : 'outline'}
                onClick={() => setSettings((prev) => ({ ...prev, defaultMode: 'read' }))}
                size="sm"
              >
                Read Along
              </Button>
              <Button
                type="button"
                variant={settings.defaultMode === 'fill' ? 'default' : 'outline'}
                onClick={() => setSettings((prev) => ({ ...prev, defaultMode: 'fill' }))}
                size="sm"
              >
                Fill in the Blank
              </Button>
              <Button
                type="button"
                variant={settings.defaultMode === 'both' ? 'default' : 'outline'}
                onClick={() => setSettings((prev) => ({ ...prev, defaultMode: 'both' }))}
                size="sm"
              >
                Both
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fillBlankDifficulty" className="text-sm flex items-center gap-2">
                Fill-in difficulty
                <Clock className="h-4 w-4 text-muted-foreground" />
              </Label>
              <input
                id="fillBlankDifficulty"
                name="fillBlankDifficulty"
                type="range"
                min={5}
                max={60}
                step={5}
                value={Math.round(settings.fillBlankDifficulty * 100)}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    fillBlankDifficulty: Number(event.target.value) / 100,
                  }))
                }
                className="block w-full accent-primary"
                aria-describedby="fillBlankDifficultyHelp"
              />
              <p id="fillBlankDifficultyHelp" className="text-xs text-muted-foreground">
                Approximately {Math.round(settings.fillBlankDifficulty * 100)}% of the words will be hidden in fill-in mode.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxReadSwitches" className="text-sm">Read-along switches</Label>
              <Input
                id="maxReadSwitches"
                type="number"
                min={0}
                placeholder="Unlimited"
                value={settings.maxReadModeSwitches ?? ''}
                onChange={(event) => {
                  const { value } = event.target;
                  setSettings((prev) => ({
                    ...prev,
                    maxReadModeSwitches: value === '' ? null : Math.max(0, Math.floor(Number(value) || 0)),
                  }));
                }}
                className="w-36"
              />
              <p className="text-xs text-muted-foreground">
                Limit how many times students can switch back to Read Along. Leave blank for unlimited access.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Lyric Lines</h2>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAllLines((prev) => !prev)}
              disabled={lines.length === 0}
            >
              {showAllLines ? 'Show one line' : 'Show all lines'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (!selectedLine) return;
                removeLine(selectedLine.id);
              }}
              disabled={!manualEditingEnabled || lines.length <= 1 || !selectedLine}
            >
              Remove current
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => addLineAfter(selectedLine?.id ?? '')}
              disabled={!manualEditingEnabled}
            >
              Add Line
            </Button>
          </div>
        </div>

        {lines.length === 0 ? (
          <p className="rounded-md border border-dashed border-border/70 bg-card/40 p-6 text-center text-sm text-muted-foreground">
            Paste your lyrics, click &ldquo;Generate Lines&rdquo;, then fine-tune the text and timings here.
          </p>
        ) : showAllLines ? (
          <div className="space-y-3">
            {lines.map((line, index) => (
              <div key={line.id}>{renderLineEditor(line, index, true)}</div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {selectedLine ? (
              <>
                {renderLineEditor(selectedLine, selectedLineIndex, false)}
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => shiftSelection(-1)}
                    disabled={selectedLineIndex <= 0}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => shiftSelection(1)}
                    disabled={selectedLineIndex === -1 || selectedLineIndex >= lines.length - 1}
                  >
                    Next
                  </Button>
                </div>
              </>
            ) : (
              <p className="rounded-md border border-dashed border-border/70 bg-card/40 p-6 text-center text-sm text-muted-foreground">
                Add a lyric line to start editing.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : isEditMode ? 'Update Lesson' : 'Create Lesson'}
        </Button>
      </div>
      </form>

      <Dialog open={isGuideOpen} onOpenChange={setIsGuideOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Preparing timed lyrics</DialogTitle>
            <DialogDescription>
              Quick reference for importing an audio track and LRC file. Press Cmd + ? anytime to reopen this guide.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm text-muted-foreground">
            <section>
              <h3 className="font-semibold text-foreground">1. Produce or collect the audio + LRC pair</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Use your preferred editor (e.g. MiniLyrics, Aegisub, or an online converter) to export the song as a <code>.lrc</code> file.</li>
                <li>Check that each line contains a timestamp in the format <code>[mm:ss.xx]</code> or <code>[mm:ss.xxx]</code>.</li>
                <li>If your tool exports multiple timestamps per line, we&apos;ll duplicate the lyric text for each timestamp automatically.</li>
              </ul>
            </section>
            <section>
              <h3 className="font-semibold text-foreground">2. Upload in LessonHUB</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Upload the audio track first so you can preview playback.</li>
                <li>Upload the matching <code>.lrc</code> file—LessonHUB will parse the timestamps and populate the lyric lines.</li>
                <li>You can still fine-tune start and end times per line below the editor after the import.</li>
              </ul>
            </section>
            <section>
              <h3 className="font-semibold text-foreground">3. Double-check before saving</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Use the &ldquo;Play from line start&rdquo; button to confirm each timestamp aligns with the audio.</li>
                <li>Click &ldquo;Sync from Editor&rdquo; if you adjust line text and want to refresh the raw lyric block.</li>
                <li>Add an optional reference link (e.g. the official video) for future editing.</li>
              </ul>
            </section>
            <section>
              <h3 className="font-semibold text-foreground">Helpful shortcuts</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>
                  Need an <code>.lrc</code> fast? Try{' '}
                  <a href="https://lrc-get.vercel.app/" target="_blank" rel="noopener noreferrer" className="underline">
                    Get LRC File
                  </a>{' '}
                  to convert lyrics from popular sources.
                </li>
                <li>
                  Looking for inspiration? Browse curated tracks on{' '}
                  <a href="https://open.spotify.com/" target="_blank" rel="noopener noreferrer" className="underline">
                    Spotify
                  </a>{' '}
                  while you prep lessons.
                </li>
              </ul>
            </section>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
