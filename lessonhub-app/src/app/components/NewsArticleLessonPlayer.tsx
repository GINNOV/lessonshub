// file: src/app/components/NewsArticleLessonPlayer.tsx
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Hypher from 'hypher';
import english from 'hyphenation.en-us';
import { marked } from 'marked';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Volume1, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AssignmentStatus } from '@prisma/client';
import Rating from '@/app/components/Rating';

marked.setOptions({
  gfm: true,
  breaks: true,
});

type NewsArticleLessonPlayerProps = {
  assignmentId: string;
  markdown: string;
  maxWordTaps: number | null;
  initialTapCount?: number;
  lessonTitle?: string;
  lessonPreview?: string | null;
  status?: AssignmentStatus;
  isPastDue?: boolean;
  deadlineLabel?: string | null;
  initialRating?: number | null;
  deadlineLabelText?: string;
  consultationLabel?: string;
  rateLabel?: string;
  bannerKicker?: string;
  bannerSubhead?: string;
};

const WORD_REGEX = /[A-Za-z0-9']+/g;
const TTS_RATES = [1, 0.65, 0.01];
const TTS_PAUSE_MS = [400, 800, 1400];

export default function NewsArticleLessonPlayer({
  assignmentId,
  markdown,
  maxWordTaps,
  initialTapCount = 0,
  lessonTitle,
  lessonPreview,
  status,
  isPastDue,
  deadlineLabel,
  initialRating,
  deadlineLabelText = 'Deadline:',
  consultationLabel = 'Consultation mode: no new points are awarded.',
  rateLabel = 'Rate',
  bannerKicker = 'Breaking story',
  bannerSubhead = 'Read, tap, and listen',
}: NewsArticleLessonPlayerProps) {
  const [articleHtml, setArticleHtml] = useState('');
  const [tapCount, setTapCount] = useState(initialTapCount);
  const [activeWord, setActiveWord] = useState<string | null>(null);
  const [meaning, setMeaning] = useState<string | null>(null);
  const [showMeaning, setShowMeaning] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [playbackStage, setPlaybackStage] = useState<'normal' | 'slow' | 'very slow' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rating, setRating] = useState<number>(0);
  const [localStatus, setLocalStatus] = useState<AssignmentStatus | undefined>(status);
  const speechTokenRef = useRef(0);
  const meaningCache = useRef<Map<string, string>>(new Map());
  const hypher = useMemo(() => new Hypher(english), []);

  const rawHtml = useMemo(() => (marked.parse(markdown || '') as string) || '', [markdown]);
  const tapsRemaining = maxWordTaps ? Math.max(maxWordTaps - tapCount, 0) : null;
  const hasTapLimit = typeof maxWordTaps === 'number' && maxWordTaps > 0;
  const isMaxedOut = hasTapLimit && tapCount >= maxWordTaps;

  useEffect(() => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml, 'text/html');
    const skipTags = new Set(['SCRIPT', 'STYLE', 'CODE', 'PRE', 'NOSCRIPT']);

    const walk = (node: Node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        if (skipTags.has(element.tagName)) return;
        Array.from(node.childNodes).forEach(walk);
        return;
      }
      if (node.nodeType !== Node.TEXT_NODE) return;
      const text = node.nodeValue || '';
      WORD_REGEX.lastIndex = 0;
      if (!WORD_REGEX.test(text)) return;
      WORD_REGEX.lastIndex = 0;
      const frag = doc.createDocumentFragment();
      let lastIndex = 0;
      text.replace(WORD_REGEX, (match, offset) => {
        if (offset > lastIndex) {
          frag.appendChild(doc.createTextNode(text.slice(lastIndex, offset)));
        }
        const span = doc.createElement('span');
        span.textContent = match;
        span.setAttribute('data-word', match);
        span.className =
          'news-article-word cursor-pointer rounded px-0.5 transition-colors hover:bg-amber-100';
        frag.appendChild(span);
        lastIndex = offset + match.length;
        return match;
      });
      if (lastIndex < text.length) {
        frag.appendChild(doc.createTextNode(text.slice(lastIndex)));
      }
      node.parentNode?.replaceChild(frag, node);
    };

    Array.from(doc.body.childNodes).forEach(walk);
    setArticleHtml(doc.body.innerHTML);
  }, [rawHtml]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const fetchMeaning = useCallback(async (word: string) => {
    const cached = meaningCache.current.get(word.toLowerCase());
    if (cached) return cached;
    try {
      const response = await fetch(`/api/dictionary?word=${encodeURIComponent(word)}`);
      if (!response.ok) throw new Error('Unable to fetch definition.');
      const data = await response.json();
      const definition = typeof data?.definition === 'string' && data.definition.trim()
        ? data.definition.trim()
        : 'No definition available.';
      meaningCache.current.set(word.toLowerCase(), definition);
      return definition;
    } catch {
      return 'No definition available.';
    }
  }, []);

  const speakWord = useCallback(async (word: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      toast.error('Text-to-speech is not supported in this browser.');
      return;
    }
    const synth = window.speechSynthesis;
    const token = speechTokenRef.current + 1;
    speechTokenRef.current = token;
    synth.cancel();
    setIsSpeaking(true);
    try {
      for (let i = 0; i < TTS_RATES.length; i += 1) {
        const rate = TTS_RATES[i];
        if (speechTokenRef.current !== token) return;
        setPlaybackStage(i === 0 ? 'normal' : i === 1 ? 'slow' : 'very slow');
        await new Promise<void>((resolve, reject) => {
          const utterance = new SpeechSynthesisUtterance(word);
          utterance.rate = rate;
          utterance.onend = () => resolve();
          utterance.onerror = (event) => reject(event.error);
          synth.speak(utterance);
        });
        const pauseMs = TTS_PAUSE_MS[i] ?? 0;
        if (pauseMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, pauseMs));
        }
      }
    } catch {
      toast.error('Something went wrong while playing the audio.');
    } finally {
      synth.cancel();
      if (speechTokenRef.current === token) {
        setIsSpeaking(false);
        setPlaybackStage(null);
      }
    }
  }, []);

  const handleWordTap = useCallback(async (word: string) => {
    if (!word.trim()) return;
    if (isMaxedOut) {
      toast.error('You have reached the maximum number of word taps.');
      return;
    }
    setActiveWord(word);
    speakWord(word);
    const definition = await fetchMeaning(word);
    setMeaning(definition);
    setShowMeaning(true);

    if ((localStatus ?? status) !== AssignmentStatus.PENDING) {
      return;
    }

    try {
      const response = await fetch(`/api/assignments/${assignmentId}/news-article`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || 'Unable to record tap.');
      }
      const data = await response.json();
      if (typeof data?.tapCount === 'number') {
        setTapCount(data.tapCount);
      } else {
        setTapCount((prev) => prev + 1);
      }
    } catch (error) {
      toast.error((error as Error).message || 'Unable to record tap.');
    }
  }, [assignmentId, fetchMeaning, isMaxedOut, localStatus, speakWord, status]);

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const word = target.getAttribute('data-word');
    if (!word) return;
    handleWordTap(word);
  };
  const canSubmit = (localStatus ?? status) === AssignmentStatus.PENDING && !isPastDue;
  const effectiveStatus = localStatus ?? status;
  const showAutoSubmitNote = effectiveStatus === AssignmentStatus.PENDING && isPastDue;
  const isConsultationOnly = effectiveStatus !== AssignmentStatus.PENDING;
  useEffect(() => {
    setRating(typeof initialRating === 'number' ? initialRating : 0);
  }, [initialRating]);
  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/assignments/${assignmentId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || 'Unable to submit.');
      }
      toast.success('Submitted!');
      setLocalStatus(AssignmentStatus.COMPLETED);
    } catch (error) {
      toast.error((error as Error).message || 'Unable to submit.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const speedMeta = (() => {
    if (playbackStage === 'normal') return { label: 'Normal', Icon: Volume2 };
    if (playbackStage === 'slow') return { label: 'Slow', Icon: Volume1 };
    if (playbackStage === 'very slow') return { label: 'Very slow', Icon: VolumeX };
    return null;
  })();
  const toItalianPhonetic = useCallback((word: string) => {
    const base = word.toLowerCase().replace(/[^a-z']/g, '');
    if (!base) return '';
    const directMap: Record<string, string> = {
      the: 'di',
      this: 'dis',
      that: 'dat',
      these: 'diz',
      those: 'doz',
      there: 'der',
      they: 'dei',
      their: 'deir',
      them: 'dem',
      you: 'iu',
      your: 'iuor',
      with: 'uiz',
      to: 'tu',
      of: 'ov',
      and: 'end',
      are: 'ar',
      was: 'uas',
      were: 'uer',
    };
    if (directMap[base]) return directMap[base];
    let phonetic = base;
    phonetic = phonetic.replace(/tial/g, 'cial');
    phonetic = phonetic.replace(/^ru/, 'ra');
    phonetic = phonetic.replace(/ssia/g, 'scia');
    phonetic = phonetic.replace(/^eu/, 'iu');
    phonetic = phonetic.replace(/eu/g, 'iu');
    phonetic = phonetic.replace(/^thr/, 'fr');
    phonetic = phonetic.replace(/^wa/, 'uo');
    phonetic = phonetic.replace(/wa/g, 'uo');
    phonetic = phonetic.replace(/tion/g, 'cion');
    phonetic = phonetic.replace(/ture/g, 'ciur');
    phonetic = phonetic.replace(/th/g, 't');
    phonetic = phonetic.replace(/sh/g, 'sci');
    phonetic = phonetic.replace(/ph/g, 'f');
    phonetic = phonetic.replace(/gh/g, 'g');
    phonetic = phonetic.replace(/ck/g, 'c');
    phonetic = phonetic.replace(/qu/g, 'ku');
    phonetic = phonetic.replace(/oo/g, 'u');
    phonetic = phonetic.replace(/ee/g, 'i');
    phonetic = phonetic.replace(/ea/g, 'i');
    phonetic = phonetic.replace(/ai/g, 'e');
    phonetic = phonetic.replace(/ay/g, 'ei');
    phonetic = phonetic.replace(/oi/g, 'oi');
    phonetic = phonetic.replace(/ow/g, 'au');
    phonetic = phonetic.replace(/ou/g, 'au');
    phonetic = phonetic.replace(/wh/g, 'u');
    phonetic = phonetic.replace(/w/g, 'u');
    phonetic = phonetic.replace(/j/g, 'gi');
    phonetic = phonetic.replace(/y/g, 'i');
    phonetic = phonetic.replace(/x/g, 'cs');
    phonetic = phonetic.replace(/c([ei])/g, 'ch$1');
    phonetic = phonetic.replace(/g([ei])/g, 'gh$1');
    phonetic = phonetic.replace(/h/g, '');
    phonetic = phonetic.replace(/er\b/g, 'er');
    phonetic = phonetic.replace(/or\b/g, 'or');
    return phonetic;
  }, []);
  const italianPhonetic = useMemo(() => {
    if (!activeWord) return '';
    return toItalianPhonetic(activeWord);
  }, [activeWord, toItalianPhonetic]);
  const syllableParts = useMemo(() => {
    if (!activeWord) return [];
    const clean = activeWord.replace(/[^A-Za-z']/g, '');
    if (!clean || clean.length !== activeWord.length) return [];
    return hypher.hyphenate(clean);
  }, [activeWord, hypher]);
  const playbackStageOrder =
    playbackStage === 'normal' ? 1 : playbackStage === 'slow' ? 2 : playbackStage === 'very slow' ? 3 : 0;
  const highlightedSyllables = playbackStageOrder >= 3
    ? syllableParts.length
    : Math.min(playbackStageOrder, syllableParts.length);
  const playbackWord = activeWord ?? '—';

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50 via-stone-50 to-amber-100/60 p-4 shadow-[0_18px_45px_rgba(120,53,15,0.08)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-amber-700/80">LessonHub Times</p>
            <h2 className="mt-2 text-2xl font-semibold text-stone-900 sm:text-3xl">
              {lessonTitle || 'News Article'}
            </h2>
            {lessonPreview && (
              <p className="mt-2 text-sm text-stone-700">{lessonPreview}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="bg-amber-200/70 text-amber-900">
              +50 pts / €0.50 per tap
            </Badge>
            <Badge variant="secondary" className="bg-stone-200/80 text-stone-800">
              {hasTapLimit ? `${tapsRemaining} taps left` : `${tapCount} taps`}
            </Badge>
            <Badge variant="secondary" className="bg-emerald-200/70 text-emerald-900">
              {tapCount * 50} pts / €{(tapCount * 0.5).toFixed(2)}
            </Badge>
          </div>
        </div>
      </div>

      <div
        className={cn(
          'relative rounded-3xl border border-stone-200 bg-stone-50/90 p-6 shadow-[0_22px_60px_rgba(24,24,24,0.08)]',
          'before:absolute before:inset-0 before:-z-10 before:rounded-3xl before:bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.18),_transparent_55%)]'
        )}
      >
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-stone-500">
          <span>{bannerKicker}</span>
          <span className="h-1 w-1 rounded-full bg-stone-400" />
          <span>{bannerSubhead}</span>
        </div>
        <div
          className={cn(
            'prose prose-stone max-w-none font-serif text-stone-800',
            isMaxedOut && 'opacity-70'
          )}
          onClick={handleClick}
          aria-live="polite"
          dangerouslySetInnerHTML={{ __html: articleHtml }}
        />
      </div>

      <div
        className={cn(
          'fixed bottom-6 left-1/2 z-30 w-[min(92vw,720px)] -translate-x-1/2 rounded-2xl border border-stone-200 bg-white/95 px-5 py-4 shadow-[0_14px_40px_rgba(0,0,0,0.12)] transition-opacity duration-500',
          showMeaning ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-stone-500">Word meaning</p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <p className="text-lg font-semibold text-stone-900">
                {isSpeaking && syllableParts.length > 0 ? (
                  syllableParts.map((part: string, index: number) => (
                    <span key={`${part}-${index}`}>
                      <span
                        className={cn(
                          'transition-colors',
                          index < highlightedSyllables ? 'text-amber-700' : 'text-stone-400'
                        )}
                      >
                        {part}
                      </span>
                      {index < syllableParts.length - 1 ? '·' : ''}
                    </span>
                  ))
                ) : (
                  playbackWord
                )}
              </p>
              {isSpeaking && speedMeta && (
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-stone-500">
                  <speedMeta.Icon className="h-4 w-4 text-amber-700" />
                  <span>{speedMeta.label}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-amber-300 text-amber-900">
              {italianPhonetic ? `🇮🇹 ${italianPhonetic}` : 'Tap a word'}
            </Badge>
            <button
              type="button"
              onClick={() => setShowMeaning(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 text-xs font-semibold text-stone-700 transition hover:border-stone-300 hover:bg-stone-100"
              aria-label="Dismiss meaning"
            >
              X
            </button>
          </div>
        </div>
        <p className="mt-3 text-sm text-stone-700">{meaning ?? 'Tap a word to see the meaning.'}</p>
      </div>

      {(canSubmit || showAutoSubmitNote || isConsultationOnly) && (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white/80 px-4 py-3 text-sm text-stone-700">
        <div className="flex flex-col gap-1">
          {deadlineLabel && (
            <span className="text-xs uppercase tracking-[0.2em] text-stone-500">
              {deadlineLabelText} {deadlineLabel}
            </span>
          )}
          {showAutoSubmitNote && (
            <span className="text-xs text-amber-700">
              This lesson auto-submits after the deadline.
            </span>
          )}
          {isConsultationOnly && (
            <span className="text-xs text-emerald-700">
              {consultationLabel}
            </span>
          )}
        </div>
        {canSubmit && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-[0.2em] text-stone-500">{rateLabel}</span>
              <Rating
                initialRating={rating}
                onRatingChange={(value) => setRating(value)}
                starSize={18}
                disabled={!canSubmit || isSubmitting}
                inactiveClassName="text-stone-500"
              />
            </div>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              className="bg-emerald-500 text-white hover:bg-emerald-600"
            >
              {isSubmitting ? 'Submitting…' : 'Submit'}
            </Button>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
