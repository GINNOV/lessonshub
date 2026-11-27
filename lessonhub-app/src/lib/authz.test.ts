import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/prisma', () => ({
  default: {
    lesson: { findUnique: vi.fn() },
    assignment: { findUnique: vi.fn() },
  },
}));

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import {
  AuthorizationError,
  authorizeAdmin,
  authorizeAssignmentLessonOwner,
  authorizeFullAdmin,
  authorizeLessonOwner,
  authorizeUser,
  requireAdmin,
} from '@/lib/authz';

const signIn = (user: Record<string, unknown> | null) =>
  vi.mocked(auth).mockResolvedValue((user ? { user } : null) as never);

const student = { id: 'student-1', role: 'STUDENT', hasAdminPortalAccess: false };
const teacher = { id: 'teacher-1', role: 'TEACHER', hasAdminPortalAccess: false };
const otherTeacher = { id: 'teacher-2', role: 'TEACHER', hasAdminPortalAccess: false };
const admin = { id: 'admin-1', role: 'ADMIN', hasAdminPortalAccess: false };
const portalUser = { id: 'portal-1', role: 'TEACHER', hasAdminPortalAccess: true };

describe('authz guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue({ id: 'lesson-1', teacherId: 'teacher-1' } as never);
    vi.mocked(prisma.assignment.findUnique).mockResolvedValue({ lessonId: 'lesson-1' } as never);
  });

  it('authorizeUser rejects a missing session with 401', async () => {
    signIn(null);
    await expect(authorizeUser()).resolves.toMatchObject({ ok: false, status: 401 });
  });

  it('authorizeUser accepts any signed-in user', async () => {
    signIn(student);
    await expect(authorizeUser()).resolves.toMatchObject({ ok: true, user: { id: 'student-1' } });
  });

  it('authorizeAdmin: 401 anonymous, 403 student, ok for ADMIN and portal access', async () => {
    signIn(null);
    await expect(authorizeAdmin()).resolves.toMatchObject({ ok: false, status: 401 });
    signIn(student);
    await expect(authorizeAdmin()).resolves.toMatchObject({ ok: false, status: 403 });
    signIn(admin);
    await expect(authorizeAdmin()).resolves.toMatchObject({ ok: true });
    signIn(portalUser);
    await expect(authorizeAdmin()).resolves.toMatchObject({ ok: true });
  });

  it('authorizeFullAdmin rejects admin-portal access without the ADMIN role', async () => {
    signIn(portalUser);
    await expect(authorizeFullAdmin()).resolves.toMatchObject({ ok: false, status: 403 });
    signIn(admin);
    await expect(authorizeFullAdmin()).resolves.toMatchObject({ ok: true });
  });

  it('requireAdmin throws AuthorizationError for non-admins', async () => {
    signIn(student);
    await expect(requireAdmin()).rejects.toBeInstanceOf(AuthorizationError);
  });

  it('authorizeLessonOwner: owner ok, other teacher 404, student 403, anonymous 401', async () => {
    signIn(teacher);
    await expect(authorizeLessonOwner('lesson-1')).resolves.toMatchObject({ ok: true, lesson: { id: 'lesson-1' } });
    signIn(otherTeacher);
    await expect(authorizeLessonOwner('lesson-1')).resolves.toMatchObject({ ok: false, status: 404 });
    signIn(student);
    await expect(authorizeLessonOwner('lesson-1')).resolves.toMatchObject({ ok: false, status: 403 });
    signIn(null);
    await expect(authorizeLessonOwner('lesson-1')).resolves.toMatchObject({ ok: false, status: 401 });
  });

  it('authorizeLessonOwner lets admins through only with allowAdmin', async () => {
    signIn(admin);
    await expect(authorizeLessonOwner('lesson-1')).resolves.toMatchObject({ ok: false, status: 403 });
    await expect(authorizeLessonOwner('lesson-1', { allowAdmin: true })).resolves.toMatchObject({ ok: true });
  });

  it('authorizeLessonOwner returns 404 for a missing lesson', async () => {
    signIn(teacher);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue(null as never);
    await expect(authorizeLessonOwner('nope')).resolves.toMatchObject({ ok: false, status: 404 });
  });

  it('authorizeAssignmentLessonOwner checks the owner of the assignment lesson', async () => {
    signIn(teacher);
    await expect(authorizeAssignmentLessonOwner('assignment-1')).resolves.toMatchObject({ ok: true });
    signIn(otherTeacher);
    await expect(authorizeAssignmentLessonOwner('assignment-1')).resolves.toMatchObject({ ok: false, status: 404 });
    vi.mocked(prisma.assignment.findUnique).mockResolvedValue(null as never);
    signIn(teacher);
    await expect(authorizeAssignmentLessonOwner('missing')).resolves.toMatchObject({ ok: false, status: 404 });
  });
});
