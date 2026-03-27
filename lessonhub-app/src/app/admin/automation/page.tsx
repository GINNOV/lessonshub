import Link from "next/link";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";

import { auth } from "@/auth";
import { getAllTeachers } from "@/actions/adminActions";
import AdminAutomationManager from "@/app/components/AdminAutomationManager";
import prisma from "@/lib/prisma";

export default async function AdminAutomationPage() {
  const session = await auth();
  const hasAdminAccess = session && (session.user.role === Role.ADMIN || session.user.hasAdminPortalAccess);
  if (!hasAdminAccess) {
    redirect("/");
  }

  const [teachers, tokens] = await Promise.all([
    getAllTeachers(),
    prisma.automationToken.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        tokenPrefix: true,
        label: true,
        ownerId: true,
        createdById: true,
        lastUsedAt: true,
        revokedAt: true,
        createdAt: true,
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
  ]);

  const teacherOptions = teachers
    .filter((teacher) => !teacher.isSuspended)
    .map((teacher) => ({
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
    }));

  const serializableTokens = tokens.map((token) => ({
    ...token,
    createdAt: token.createdAt.toISOString(),
    lastUsedAt: token.lastUsedAt?.toISOString() ?? null,
    revokedAt: token.revokedAt?.toISOString() ?? null,
  }));

  return (
    <div className="space-y-6 text-slate-100">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Automation Tokens</h1>
          <p className="mt-2 text-sm text-slate-400">
            Grant Codex automations scoped access to create lessons through token-gated APIs.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin"
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-100 hover:border-teal-400/60"
          >
            ← Admin home
          </Link>
          <Link
            href="/admin/settings"
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-100 hover:border-teal-400/60"
          >
            Dashboard settings
          </Link>
        </div>
      </div>
      <AdminAutomationManager teachers={teacherOptions} initialTokens={serializableTokens} />
    </div>
  );
}
