'use client';

import { useEffect, useRef, useState } from 'react';
import type { DependencyList } from 'react';

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

type AutoSaveOptions = {
  enabled: boolean;
  isEditMode: boolean;
  canSave: boolean;
  isSavingBlocked?: boolean;
  delayMs?: number;
  onSave: () => Promise<boolean>;
  dependencies: DependencyList;
  resetKey?: string | number | null;
};

export function useLessonAutosave({
  enabled,
  isEditMode,
  canSave,
  isSavingBlocked = false,
  delayMs = 1500,
  onSave,
  dependencies,
  resetKey,
}: AutoSaveOptions) {
  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipInitialRef = useRef(true);
  const savingRef = useRef(false);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    skipInitialRef.current = true;
    setStatus('idle');
    setLastSavedAt(null);
  }, [resetKey]);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!enabled || !isEditMode || isSavingBlocked) return;
    if (skipInitialRef.current) {
      skipInitialRef.current = false;
      return;
    }
    if (!canSave) return;
    timerRef.current = setTimeout(async () => {
      if (savingRef.current) return;
      savingRef.current = true;
      setStatus('saving');
      try {
        const ok = await onSave();
        if (ok) {
          setStatus('saved');
          setLastSavedAt(new Date());
        } else {
          setStatus('error');
        }
      } catch {
        setStatus('error');
      } finally {
        savingRef.current = false;
      }
    }, delayMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [enabled, isEditMode, canSave, isSavingBlocked, delayMs, onSave, dependencies]);

  return { status, lastSavedAt };
}

export function formatAutoSaveStatus(status: AutoSaveStatus, lastSavedAt: Date | null) {
  switch (status) {
    case 'saving':
      return 'Autosaving...';
    case 'saved':
      return lastSavedAt
        ? `Autosaved at ${lastSavedAt.toLocaleTimeString()}`
        : 'Autosaved.';
    case 'error':
      return 'Autosave failed. Please save manually.';
    default:
      return '';
  }
}
