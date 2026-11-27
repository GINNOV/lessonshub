import { Role } from "@prisma/client";
import type { Session } from "next-auth";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

type AdminCandidate = {
  role?: Role | null;
  hasAdminPortalAccess?: boolean | null;
} | null | undefined;

export function hasAdminPrivileges(user: AdminCandidate): boolean {
  return Boolean(user && (user.role === Role.ADMIN || user.hasAdminPortalAccess));
}

export type SessionUser = Session["user"];

export type AuthzFailure = {
  ok: false;
  status: 401 | 403 | 404;
  error: string;
};

export type AuthzResult<T extends object = object> = ({ ok: true; user: SessionUser } & T) | AuthzFailure;

const unauthenticated: AuthzFailure = { ok: false, status: 401, error: "Unauthorized" };
const forbidden: AuthzFailure = { ok: false, status: 403, error: "Forbidden" };

export class AuthorizationError extends Error {
  constructor(public readonly status: AuthzFailure["status"], message: string) {
    super(message);
    this.name = "AuthorizationError";
  }
}

/** Any signed-in user. */
export async function authorizeUser(): Promise<AuthzResult> {
  const session = await auth();
  if (!session?.user?.id) return unauthenticated;
  return { ok: true, user: session.user };
}

/** ADMIN role or admin-portal access. */
export async function authorizeAdmin(): Promise<AuthzResult> {
  const result = await authorizeUser();
  if (!result.ok) return result;
  return hasAdminPrivileges(result.user) ? result : forbidden;
}

/** ADMIN role only. Admin-portal access is not enough. */
export async function authorizeFullAdmin(): Promise<AuthzResult> {
  const result = await authorizeUser();
  if (!result.ok) return result;
  return result.user.role === Role.ADMIN ? result : forbidden;
}

type LessonOwnerOptions = { allowAdmin?: boolean };

/**
 * The signed-in user is the TEACHER who owns the lesson, or (with allowAdmin) an admin.
 * A lesson that does not exist and a lesson owned by someone else both return 404.
 */
export async function authorizeLessonOwner(
  lessonId: string,
  { allowAdmin = false }: LessonOwnerOptions = {},
): Promise<AuthzResult<{ lesson: { id: string; teacherId: string | null } }>> {
  const result = await authorizeUser();
  if (!result.ok) return result;

  const isAdmin = allowAdmin && hasAdminPrivileges(result.user);
  if (result.user.role !== Role.TEACHER && !isAdmin) return forbidden;

  const lesson = lessonId
    ? await prisma.lesson.findUnique({ where: { id: lessonId }, select: { id: true, teacherId: true } })
    : null;
  if (!lesson || (lesson.teacherId !== result.user.id && !isAdmin)) {
    return { ok: false, status: 404, error: "Lesson not found or you do not have access to it." };
  }
  return { ...result, lesson };
}

/** Owner (or admin, with allowAdmin) of the lesson that an assignment belongs to. */
export async function authorizeAssignmentLessonOwner(
  assignmentId: string,
  options: LessonOwnerOptions = {},
): Promise<AuthzResult<{ lesson: { id: string; teacherId: string | null } }>> {
  const result = await authorizeUser();
  if (!result.ok) return result;
  const assignment = assignmentId
    ? await prisma.assignment.findUnique({ where: { id: assignmentId }, select: { lessonId: true } })
    : null;
  if (!assignment) {
    return { ok: false, status: 404, error: "Assignment not found or you do not have access to it." };
  }
  return authorizeLessonOwner(assignment.lessonId, options);
}

function unwrap<T extends object>(result: AuthzResult<T>) {
  if (!result.ok) throw new AuthorizationError(result.status, result.error);
  return result;
}

export async function requireUser() {
  return unwrap(await authorizeUser()).user;
}

export async function requireAdmin() {
  return unwrap(await authorizeAdmin()).user;
}

export async function requireFullAdmin() {
  return unwrap(await authorizeFullAdmin()).user;
}

export async function requireLessonOwner(lessonId: string, options?: LessonOwnerOptions) {
  return unwrap(await authorizeLessonOwner(lessonId, options));
}
