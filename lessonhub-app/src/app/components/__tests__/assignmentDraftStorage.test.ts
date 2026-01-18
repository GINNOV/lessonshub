import { describe, it, expect, beforeEach } from 'vitest';
import {
  clearAssignmentDraft,
  getAssignmentDraftKey,
  readAssignmentDraft,
  writeAssignmentDraft,
} from '@/app/components/assignmentDraftStorage';

describe('assignmentDraftStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('writes and reads draft payloads', () => {
    const key = getAssignmentDraftKey('standard', 'abc123');
    writeAssignmentDraft(key, { answers: ['a'] }, 123);

    const result = readAssignmentDraft<{ answers: string[] }>(key);
    expect(result).toEqual({ updatedAt: 123, data: { answers: ['a'] } });
  });

  it('returns null for missing keys', () => {
    const key = getAssignmentDraftKey('standard', 'missing');
    expect(readAssignmentDraft(key)).toBeNull();
  });

  it('clears drafts', () => {
    const key = getAssignmentDraftKey('multi-choice', 'abc123');
    writeAssignmentDraft(key, { answers: { q1: 'a' } }, 456);
    clearAssignmentDraft(key);

    expect(readAssignmentDraft(key)).toBeNull();
  });
});
