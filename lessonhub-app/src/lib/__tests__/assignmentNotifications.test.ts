import { describe, it, expect } from 'vitest';
import { getImmediateStartStudentIds } from '../assignmentNotifications.js';

describe('getImmediateStartStudentIds', () => {
  it('includes students whose start date is in the past or now', () => {
    const now = new Date('2024-01-01T12:00:00Z');
    const entries = [
      { studentId: 'past', startDate: new Date('2024-01-01T11:59:59Z') },
      { studentId: 'now', startDate: new Date('2024-01-01T12:00:00Z') },
      { studentId: 'future', startDate: new Date('2024-01-01T12:00:01Z') },
    ];

    const result = getImmediateStartStudentIds(entries, now);

    expect(result.sort()).toEqual(['now', 'past']);
  });

  it('returns an empty array when no entries qualify', () => {
    const now = new Date('2024-01-01T12:00:00Z');
    const entries = [
      { studentId: 'future-a', startDate: new Date('2024-01-01T12:00:01Z') },
      { studentId: 'future-b', startDate: new Date('2024-01-02T12:00:00Z') },
    ];

    const result = getImmediateStartStudentIds(entries, now);

    expect(result).toEqual([]);
  });
});
