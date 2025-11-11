import { Role } from "@prisma/client";

type AdminCandidate = {
  role?: Role | null;
  hasAdminPortalAccess?: boolean | null;
} | null | undefined;

export function hasAdminPrivileges(user: AdminCandidate): boolean {
  return Boolean(user && (user.role === Role.ADMIN || user.hasAdminPortalAccess));
}
