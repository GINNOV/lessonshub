import React, { useMemo } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, screen } from '@testing-library/react';

vi.unmock('@/app/components/useLessonAutosave');

let useLessonAutosaveFn: typeof import('@/app/components/useLessonAutosave').useLessonAutosave;
let formatAutoSaveStatusFn: typeof import('@/app/components/useLessonAutosave').formatAutoSaveStatus;

type HarnessProps = {
  value: string;
  enabled?: boolean;
  isEditMode?: boolean;
  canSave?: boolean;
  isSavingBlocked?: boolean;
  resetKey?: string | number | null;
  onSave: () => Promise<boolean>;
};

function AutosaveHarness({
  value,
  enabled = true,
  isEditMode = true,
  canSave = true,
  isSavingBlocked = false,
  resetKey = null,
  onSave,
}: HarnessProps) {
  const autoSaveDependencies = useMemo(() => [value], [value]);
  const { status, lastSavedAt } = useLessonAutosaveFn({
    enabled,
    isEditMode,
    canSave,
    isSavingBlocked,
    onSave,
    dependencies: autoSaveDependencies,
    resetKey,
    delayMs: 500,
  });
  const message = formatAutoSaveStatusFn(status, lastSavedAt) || 'idle';
  return <div>{message}</div>;
}

function InlineDepsHarness({
  value,
  onSave,
}: Pick<HarnessProps, 'value' | 'onSave'>) {
  const { status, lastSavedAt } = useLessonAutosaveFn({
    enabled: true,
    isEditMode: true,
    canSave: true,
    onSave,
    dependencies: [value],
    delayMs: 500,
  });
  const message = formatAutoSaveStatusFn(status, lastSavedAt) || 'idle';
  return <div>{message}</div>;
}

describe('useLessonAutosave', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    const mod = await import('@/app/components/useLessonAutosave');
    useLessonAutosaveFn = mod.useLessonAutosave;
    formatAutoSaveStatusFn = mod.formatAutoSaveStatus;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not autosave on initial render', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    render(<AutosaveHarness value="initial" onSave={onSave} />);

    await act(async () => {
      vi.advanceTimersByTime(600);
      await Promise.resolve();
    });

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('idle')).toBeInTheDocument();
  });

  it('autosaves after debounce when dependencies change', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    const { rerender } = render(<AutosaveHarness value="initial" onSave={onSave} />);

    rerender(<AutosaveHarness value="updated" onSave={onSave} />);

    await act(async () => {
      vi.advanceTimersByTime(600);
      await Promise.resolve();
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Autosaved/)).toBeInTheDocument();
  });

  it('skips autosave when blocked or disabled', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    const { rerender } = render(
      <AutosaveHarness value="initial" isSavingBlocked onSave={onSave} />
    );

    rerender(<AutosaveHarness value="updated" isSavingBlocked onSave={onSave} />);

    await act(async () => {
      vi.advanceTimersByTime(600);
      await Promise.resolve();
    });

    expect(onSave).not.toHaveBeenCalled();

    rerender(<AutosaveHarness value="next" enabled={false} onSave={onSave} />);

    await act(async () => {
      vi.advanceTimersByTime(600);
      await Promise.resolve();
    });

    expect(onSave).not.toHaveBeenCalled();
  });

  it('resets status when resetKey changes', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    const { rerender } = render(<AutosaveHarness value="initial" onSave={onSave} resetKey="a" />);

    rerender(<AutosaveHarness value="updated" onSave={onSave} resetKey="a" />);

    await act(async () => {
      vi.advanceTimersByTime(600);
      await Promise.resolve();
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Autosaved/)).toBeInTheDocument();

    rerender(<AutosaveHarness value="updated" onSave={onSave} resetKey="b" />);

    expect(screen.getByText('idle')).toBeInTheDocument();
  });

  it('ignores dependency array identity when values are unchanged', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    const { rerender } = render(<InlineDepsHarness value="same" onSave={onSave} />);

    rerender(<InlineDepsHarness value="same" onSave={onSave} />);

    await act(async () => {
      vi.advanceTimersByTime(600);
      await Promise.resolve();
    });

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('idle')).toBeInTheDocument();
  });
});
