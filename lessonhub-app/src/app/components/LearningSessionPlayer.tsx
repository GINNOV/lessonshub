'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type LearningSessionCard = {
  id: string;
  orderIndex: number;
  content1: string | null;
  content2: string | null;
  content3?: string | null;
  content4?: string | null;
  extra?: string | null;
};

interface LearningSessionPlayerProps {
  cards: LearningSessionCard[];
  lessonTitle?: string;
}

const CARD_COLORS = [
  { bg: 'bg-rose-50', border: 'border-rose-100' },
  { bg: 'bg-blue-50', border: 'border-blue-100' },
  { bg: 'bg-emerald-50', border: 'border-emerald-100' },
  { bg: 'bg-amber-50', border: 'border-amber-100' },
] as const;

type Stage = {
  key: string;
  text: string;
  showTts?: boolean;
  ttsText?: string;
};

export default function LearningSessionPlayer({ cards, lessonTitle }: LearningSessionPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [nextPlaybackMode, setNextPlaybackMode] = useState<'normal' | 'slow'>('normal');
  const [isAnimating, setIsAnimating] = useState(false);

  const orderedCards = useMemo(
    () => [...cards].sort((a, b) => a.orderIndex - b.orderIndex),
    [cards]
  );

  const currentCard = orderedCards[currentIndex];

  const stages = useMemo(() => {
    if (!currentCard) return [];
    const sequence: Stage[] = [];
    const c1 = currentCard.content1?.trim();
    const c2 = currentCard.content2?.trim();
    const c3 = currentCard.content3?.trim();
    const c4 = currentCard.content4?.trim();

    if (c1) sequence.push({ key: 'content1', text: c1 });
    if (c2) sequence.push({ key: 'content2', text: c2 });

    if (c1 || c2) {
      const combinedText = [c1, c2].filter(Boolean).join('\n');
      if (combinedText.trim()) {
        sequence.push({
          key: 'blend',
          text: combinedText,
          showTts: Boolean(c3 || c1),
          ttsText: (c3 || c1 || '').trim() || undefined,
        });
      }
    }

    if (c4) sequence.push({ key: 'content4', text: c4 });

    if (sequence.length === 0) {
      sequence.push({ key: 'empty', text: 'No content available for this card.' });
    }

    return sequence;
  }, [currentCard]);

  useEffect(() => {
    setStageIndex(0);
  }, [currentIndex]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const animateFlip = () => {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 500);
  };

  const handleFlip = (withAnimation = false) => {
    if (stages.length === 0) return;
    if (withAnimation) animateFlip();
    setStageIndex((prev) => (prev + 1) % stages.length);
  };

  const handleNextCard = () => {
    setCurrentIndex((prev) => (prev + 1) % orderedCards.length);
    setStageIndex(0);
    animateFlip();
  };

  const handleSpeak = () => {
    const textToSpeak =
      stages[stageIndex]?.ttsText?.trim() || currentCard?.content3?.trim() || currentCard?.content1?.trim() || '';

    if (!textToSpeak) {
      toast.error('Nothing to read aloud for this step.');
      return;
    }
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      toast.error('Text-to-speech is not supported in this browser.');
      return;
    }
    const synth = window.speechSynthesis;
    const currentMode = nextPlaybackMode;
    const targetRate = currentMode === 'normal' ? 1 : 0.5;

    const speakOnce = async () => {
      setIsSpeaking(true);
      synth.cancel();
      try {
        await new Promise<void>((resolve, reject) => {
          try {
            const utterance = new SpeechSynthesisUtterance(textToSpeak);
            utterance.rate = targetRate;
            utterance.onend = () => resolve();
            utterance.onerror = (event) => reject(event.error);
            synth.speak(utterance);
          } catch (err) {
            reject(err);
          }
        });
        setNextPlaybackMode(currentMode === 'normal' ? 'slow' : 'normal');
      } catch (error) {
        toast.error('Something went wrong while playing the audio.');
      } finally {
        synth.cancel();
        setIsSpeaking(false);
      }
    };

    speakOnce();
  };

  if (!orderedCards.length) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-gray-600">
        No learning session cards have been added yet.
      </div>
    );
  }

  const activeStage = stages[stageIndex] ?? stages[0];
  const activeColor = CARD_COLORS[stageIndex % CARD_COLORS.length];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
        <span>
          Card {currentIndex + 1} of {orderedCards.length}
        </span>
        <span>
          Flip {stageIndex + 1} of {stages.length} &middot; loops automatically
        </span>
      </div>

      <div className="flex items-center justify-center">
        <div
          className={cn(
            'relative rounded-2xl border p-6 text-center shadow-lg transition-transform duration-500 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            activeColor.bg,
            activeColor.border,
            isAnimating ? 'scale-95 rotate-1' : 'scale-100'
          )}
          aria-live="polite"
        >
          <p className="whitespace-pre-line text-lg font-medium leading-relaxed text-gray-900">
            {activeStage?.text}
          </p>
          <p className="mt-3 text-xs uppercase tracking-wide text-gray-500">
            Tap to flip &middot; loops after the final step
          </p>
        {activeStage?.showTts && (
          <div className="mt-4 flex flex-col items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(event) => {
                event.stopPropagation();
                handleSpeak();
              }}
              disabled={isSpeaking}
            >
              <Volume2 className="mr-2 h-4 w-4" />
              {isSpeaking ? 'Playing…' : 'LISTEN'}
            </Button>
            <p className="text-[11px] uppercase tracking-wide text-gray-500">
              Next playback: {nextPlaybackMode === 'normal' ? 'normal speed' : 'slow speed'}
            </p>
          </div>
        )}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button type="button" variant="outline" onClick={() => handleFlip(true)}>
          <RotateCw className="mr-2 h-4 w-4" />
          Flip card
        </Button>
        <Button type="button" onClick={handleNextCard}>
          Next card
        </Button>
      </div>

      {lessonTitle && (
        <p className="text-xs text-gray-500 text-center">
          You&apos;re viewing <span className="font-semibold">{lessonTitle}</span>. Feel free to loop through cards at your own pace.
        </p>
      )}
    </div>
  );
}
