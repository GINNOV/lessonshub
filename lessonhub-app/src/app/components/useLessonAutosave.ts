'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
  const depsSignature = useMemo(() => {
    return dependencies
      .map((dep) => {
        if (typeof dep === 'string') return `s:${dep}`;
        if (typeof dep === 'number') return `n:${dep}`;
        if (typeof dep === 'boolean') return `b:${dep}`;
        if (dep === null) return 'null';
        if (dep === undefined) return 'undefined';
        return `o:${Object.prototype.toString.call(dep)}`;
      })
      .join('|');
  }, [dependencies]);
  const prevDepsSignatureRef = useRef<string>(depsSignature);
  const prevCanSaveRef = useRef<boolean>(canSave);
  const latestDepsSignatureRef = useRef<string>(depsSignature);
  const latestCanSaveRef = useRef<boolean>(canSave);
  const savingRef = useRef(false);

  useEffect(() => {
    latestDepsSignatureRef.current = depsSignature;
  }, [depsSignature]);

  useEffect(() => {
    latestCanSaveRef.current = canSave;
  }, [canSave]);

  useLayoutEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    skipInitialRef.current = true;
    prevDepsSignatureRef.current = latestDepsSignatureRef.current;
    prevCanSaveRef.current = latestCanSaveRef.current;
    setStatus('idle');
    setLastSavedAt(null);
  }, [resetKey]);

  useLayoutEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!enabled || !isEditMode || isSavingBlocked) return;
    const depsChanged = prevDepsSignatureRef.current !== depsSignature;
    const canSaveJustEnabled = !prevCanSaveRef.current && canSave;
    prevDepsSignatureRef.current = depsSignature;
    prevCanSaveRef.current = canSave;
    if (skipInitialRef.current) {
      skipInitialRef.current = false;
      if (!depsChanged && !canSaveJustEnabled) return;
    }
    if (!canSave) return;
    if (!depsChanged && !canSaveJustEnabled) return;

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
  }, [enabled, isEditMode, canSave, isSavingBlocked, delayMs, onSave, depsSignature]);

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
