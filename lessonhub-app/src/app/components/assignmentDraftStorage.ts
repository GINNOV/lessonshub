const STORAGE_PREFIX = 'lessonhub-assignment-draft';

export type AssignmentDraftPayload<T> = {
  updatedAt: number;
  data: T;
};

export const getAssignmentDraftKey = (kind: string, assignmentId: string) =>
  `${STORAGE_PREFIX}:${kind}:${assignmentId}`;

export const readAssignmentDraft = <T>(key: string): AssignmentDraftPayload<T> | null => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AssignmentDraftPayload<T>;
    if (!parsed || typeof parsed.updatedAt !== 'number' || !('data' in parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export const writeAssignmentDraft = <T>(
  key: string,
  data: T,
  updatedAt: number = Date.now(),
) => {
  try {
    const payload: AssignmentDraftPayload<T> = { updatedAt, data };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // ignore localStorage failures
  }
};

export const clearAssignmentDraft = (key: string) => {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore localStorage failures
  }
};
