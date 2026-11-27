import { beforeEach, describe, expect, it, vi } from 'vitest';

// Every prisma.<model>.<method> is a vi.fn that resolves to null unless a test overrides it.
const prismaMock = vi.hoisted(() => {
  const models = new Map<string, Record<string, ReturnType<typeof vi.fn>>>();
  const model = (name: string) => {
    if (!models.has(name)) {
      models.set(
        name,
        new Proxy({} as Record<string, ReturnType<typeof vi.fn>>, {
          get(target, method: string) {
            if (!(method in target)) target[method] = vi.fn().mockResolvedValue(null);
            return target[method];
          },
        }),
      );
    }
    return models.get(name)!;
  };
  return {
    client: new Proxy({} as Record<string, unknown>, {
      get(_t, name: string) {
        if (name === '$transaction') return vi.fn(async (fn: (tx: unknown) => unknown) => fn(prismaMock.client));
        return model(name);
      },
    }),
    reset: () => models.clear(),
  };
});

// tests/setup.tsx stubs lessonActions for component tests; this file needs the real module.
vi.unmock('@/actions/lessonActions');
vi.mock('@/lib/prisma', () => ({ default: prismaMock.client }));
vi.mock('@/auth', () => ({ auth: vi.fn() }));
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));
vi.mock('@/lib/email-templates.server', () => ({ sendEmail: vi.fn() }));
vi.mock('@/lib/emailTemplateStore', () => ({
  loadEmailTemplateByName: vi.fn().mockResolvedValue({ buttonColor: '#000' }),
}));
vi.mock('@/lib/dailyLessonAutomation', () => ({ runDailyLessonAutomations: vi.fn() }));
vi.mock('@/lib/cronJobs', () => ({
  failExpiredAssignments: vi.fn().mockResolvedValue({ success: true }),
  sendDeadlineReminders: vi.fn().mockResolvedValue({ success: true }),
  sendStartDateNotifications: vi.fn().mockResolvedValue({ success: true }),
  sendCronTestEmail: vi.fn().mockResolvedValue({ success: true }),
  sendPaymentReminders: vi.fn().mockResolvedValue({ success: true }),
  sendWeeklySummaries: vi.fn().mockResolvedValue({ success: true }),
}));

import { auth } from '@/auth';
import { sendEmail } from '@/lib/email-templates.server';
import * as cronJobs from '@/lib/cronJobs';
import {
  assignStudentsToTeacher,
  getAllUsers,
  getEmailTemplateByName,
  reassignLesson,
  sendTestEmail,
  setAdminPortalAccess,
  updateEmailTemplate,
  updateUserRole,
} from '@/actions/adminActions';
import {
  completeFlashcardAssignment,
  failAssignment,
  generateShareLink,
  saveStandardAssignmentDraft,
  sendManualReminder,
  submitStandardAssignment,
} from '@/actions/lessonActions';
import { sendDeadlineReminders, sendWeeklySummaries } from '@/actions/cronActions';

const prisma = prismaMock.client as any;
const signIn = (user: Record<string, unknown> | null) =>
  vi.mocked(auth).mockResolvedValue((user ? { user } : null) as never);

const student = { id: 'student-1', role: 'STUDENT', hasAdminPortalAccess: false };
const teacher = { id: 'teacher-1', role: 'TEACHER', hasAdminPortalAccess: false };
const otherTeacher = { id: 'teacher-2', role: 'TEACHER', hasAdminPortalAccess: false };
const admin = { id: 'admin-1', role: 'ADMIN', hasAdminPortalAccess: false };
const portalUser = { id: 'portal-1', role: 'TEACHER', hasAdminPortalAccess: true };

beforeEach(() => {
  prismaMock.reset();
  vi.mocked(auth).mockReset();
  vi.mocked(sendEmail).mockClear();
});

describe('adminActions guards', () => {
  const mutations: Array<[string, () => Promise<{ success: boolean }>]> = [
    ['updateEmailTemplate', () => updateEmailTemplate('welcome', { subject: 'x' })],
    ['reassignLesson', () => reassignLesson('lesson-1', 'teacher-2')],
    ['sendTestEmail', () => sendTestEmail('welcome', 'victim@example.com')],
    ['assignStudentsToTeacher', () => assignStudentsToTeacher('teacher-1', ['student-1'])],
  ];

  it.each(mutations)('%s rejects anonymous callers and students without touching the DB', async (_name, call) => {
    for (const user of [null, student]) {
      signIn(user);
      await expect(call()).resolves.toMatchObject({ success: false });
    }
    expect(prisma.emailTemplate.update).not.toHaveBeenCalled();
    expect(prisma.lesson.update).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it.each(mutations)('%s works for an admin', async (_name, call) => {
    signIn(admin);
    await expect(call()).resolves.toMatchObject({ success: true });
  });

  it('updateUserRole and setAdminPortalAccess need the ADMIN role, not just portal access', async () => {
    for (const user of [null, student, portalUser]) {
      signIn(user);
      await expect(updateUserRole('student-1', 'ADMIN' as never)).resolves.toMatchObject({ success: false });
      await expect(setAdminPortalAccess('student-1', true)).resolves.toMatchObject({ success: false });
    }
    expect(prisma.user.update).not.toHaveBeenCalled();

    signIn(admin);
    await expect(updateUserRole('student-1', 'TEACHER' as never)).resolves.toMatchObject({ success: true });
    await expect(setAdminPortalAccess('student-1', true)).resolves.toMatchObject({ success: true });
  });

  it('read helpers throw for non-admins', async () => {
    signIn(student);
    await expect(getAllUsers()).rejects.toThrow();
    await expect(getEmailTemplateByName('welcome')).rejects.toThrow();
    signIn(admin);
    prisma.user.findMany.mockResolvedValue([]);
    await expect(getAllUsers()).resolves.toEqual([]);
  });
});

describe('student submission actions use the session user, not a client-supplied id', () => {
  it('rejects anonymous callers', async () => {
    signIn(null);
    await expect(submitStandardAssignment('assignment-1', { answers: [], studentNotes: '' })).resolves.toMatchObject({
      success: false,
      error: 'Unauthorized',
    });
    await expect(saveStandardAssignmentDraft('assignment-1', { answers: [], studentNotes: '' })).resolves.toMatchObject({
      success: false,
    });
    await expect(completeFlashcardAssignment('assignment-1')).resolves.toMatchObject({ success: false });
    expect(prisma.assignment.findFirst).not.toHaveBeenCalled();
    expect(prisma.assignment.update).not.toHaveBeenCalled();
  });

  it('looks the assignment up by the signed-in student id', async () => {
    signIn(student);
    await submitStandardAssignment('assignment-of-someone-else', { answers: [], studentNotes: '' });
    expect(prisma.assignment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'assignment-of-someone-else', studentId: 'student-1' }) }),
    );
    // findFirst resolved null, so nothing was written
    expect(prisma.assignment.update).not.toHaveBeenCalled();
  });
});

describe('lesson owner guards', () => {
  beforeEach(() => {
    prisma.lesson.findUnique.mockResolvedValue({ id: 'lesson-1', teacherId: 'teacher-1', public_share_id: 'share123' });
    prisma.assignment.findUnique.mockResolvedValue({ lessonId: 'lesson-1' });
  });

  it('generateShareLink: anonymous, student and other teacher are rejected; owner and admin ok', async () => {
    for (const user of [null, student, otherTeacher]) {
      signIn(user);
      await expect(generateShareLink('lesson-1')).resolves.toMatchObject({ success: false });
    }
    expect(prisma.lesson.update).not.toHaveBeenCalled();
    for (const user of [teacher, admin]) {
      signIn(user);
      await expect(generateShareLink('lesson-1')).resolves.toMatchObject({ success: true });
    }
  });

  it('sendManualReminder: only the lesson owner or an admin', async () => {
    for (const user of [null, student, otherTeacher]) {
      signIn(user);
      await expect(sendManualReminder('assignment-1')).resolves.toMatchObject({ success: false });
    }
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('failAssignment: another teacher cannot fail the assignment', async () => {
    signIn(otherTeacher);
    await expect(failAssignment('assignment-1')).resolves.toMatchObject({ success: false });
    expect(prisma.assignment.update).not.toHaveBeenCalled();
  });
});

describe('cronActions guards', () => {
  it('rejects non-admins and does not run the job', async () => {
    for (const user of [null, student, teacher]) {
      signIn(user);
      await expect(sendDeadlineReminders()).resolves.toMatchObject({ success: false });
      await expect(sendWeeklySummaries({ force: true })).resolves.toMatchObject({ success: false });
    }
    expect(cronJobs.sendDeadlineReminders).not.toHaveBeenCalled();
    expect(cronJobs.sendWeeklySummaries).not.toHaveBeenCalled();
  });

  it('runs the job for an admin', async () => {
    signIn(admin);
    await expect(sendDeadlineReminders()).resolves.toMatchObject({ success: true });
    expect(cronJobs.sendDeadlineReminders).toHaveBeenCalledOnce();
  });
});
