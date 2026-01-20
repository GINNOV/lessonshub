import React from 'react'
import '@testing-library/jest-dom'
import { vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) =>
    React.createElement('img', {
      ...props,
      alt: typeof props.alt === 'string' ? props.alt : '',
    }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: null }),
}))

vi.mock('@/app/components/useLessonAutosave', () => ({
  useLessonAutosave: () => ({
    status: 'idle',
    saveDraft: vi.fn(),
    lastSavedAt: null,
  }),
  formatAutoSaveStatus: () => '',
}))

vi.mock('@/actions/lessonActions', () => ({
  saveMultiChoiceAssignmentDraft: vi.fn().mockResolvedValue({ success: true }),
  submitMultiChoiceAssignment: vi.fn().mockResolvedValue({ success: true }),
  submitFlashcardAssignment: vi.fn().mockResolvedValue({ success: true }),
  saveComposerAssignmentDraft: vi.fn().mockResolvedValue({ success: true }),
  submitComposerAssignment: vi.fn().mockResolvedValue({ success: true }),
  saveStandardAssignmentDraft: vi.fn().mockResolvedValue({ success: true }),
  submitStandardAssignment: vi.fn().mockResolvedValue({ success: true }),
  saveLyricAssignmentDraft: vi.fn().mockResolvedValue({ success: true }),
}))

if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })
}

if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

if (!HTMLElement.prototype.scrollIntoView) {
  HTMLElement.prototype.scrollIntoView = function scrollIntoView() {}
}
