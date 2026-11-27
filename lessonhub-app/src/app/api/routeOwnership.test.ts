import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/prisma', () => ({
  default: {
    lesson: { findUnique: vi.fn() },
    assignment: { deleteMany: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
    user: { update: vi.fn() },
  },
}));
vi.mock('@/lib/email-templates.server', () => ({ sendEmail: vi.fn() }));

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { PATCH as patchAssignments } from '@/app/api/assignments/route';
import { PATCH as patchUserRole } from '@/app/api/admin/users/[userId]/route';

const signIn = (user: Record<string, unknown> | null) =>
  vi.mocked(auth).mockResolvedValue((user ? { user } : null) as never);

const jsonRequest = (body: unknown) =>
  new Request('http://localhost/api', { method: 'PATCH', body: JSON.stringify(body) });

describe('PATCH /api/assignments lesson ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue({ id: 'lesson-1', teacherId: 'teacher-1' } as never);
  });

  const unassign = { lessonId: 'lesson-1', studentIdsToUnassign: ['student-1'] };

  it('another teacher gets 404 and nothing is deleted', async () => {
    signIn({ id: 'teacher-2', role: 'TEACHER' });
    const res = await patchAssignments(jsonRequest(unassign));
    expect(res.status).toBe(404);
    expect(prisma.assignment.deleteMany).not.toHaveBeenCalled();
  });

  it('the owning teacher can unassign', async () => {
    signIn({ id: 'teacher-1', role: 'TEACHER' });
    const res = await patchAssignments(jsonRequest(unassign));
    expect(res.status).toBe(200);
    expect(prisma.assignment.deleteMany).toHaveBeenCalledOnce();
  });

  it('a student is rejected', async () => {
    signIn({ id: 'student-1', role: 'STUDENT' });
    const res = await patchAssignments(jsonRequest(unassign));
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/admin/users/[userId] role changes', () => {
  beforeEach(() => vi.clearAllMocks());
  const call = () =>
    patchUserRole(jsonRequest({ role: 'ADMIN' }) as never, { params: Promise.resolve({ userId: 'u1' }) });

  it('rejects anonymous (401) and admin-portal access without ADMIN role (403)', async () => {
    signIn(null);
    expect((await call()).status).toBe(401);
    signIn({ id: 'p1', role: 'TEACHER', hasAdminPortalAccess: true });
    expect((await call()).status).toBe(403);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('allows a full ADMIN', async () => {
    signIn({ id: 'a1', role: 'ADMIN' });
    vi.mocked(prisma.user.update).mockResolvedValue({ id: 'u1', role: 'ADMIN' } as never);
    expect((await call()).status).toBe(200);
  });
});
