import Link from "next/link";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";

import { auth } from "@/auth";
import { getAllTeachers, getDailyLessonAutomationJobs } from "@/actions/adminActions";
import AdminAutomationManager from "@/app/components/AdminAutomationManager";
import DailyLessonAutomationManager from "@/app/components/DailyLessonAutomationManager";
import prisma from "@/lib/prisma";

export default async function AdminAutomationPage() {
  const session = await auth();
  const hasAdminAccess = session && (session.user.role === Role.ADMIN || session.user.hasAdminPortalAccess);
  if (!hasAdminAccess) {
    redirect("/");
  }

  const [teachers, automationJobs, classes, tokens] = await Promise.all([
    getAllTeachers(),
    getDailyLessonAutomationJobs(),
    prisma.class.findMany({
      where: { isActive: true, teacher: { isSuspended: false } },
      select: {
        id: true,
        name: true,
        teacherId: true,
        isActive: true,
      },
      orderBy: [{ teacherId: 'asc' }, { createdAt: 'asc' }],
    }),
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

  const serializableJobs = automationJobs.map((job) => ({
    id: job.id,
    name: job.name,
    isEnabled: job.isEnabled,
    teacherId: job.teacherId,
    classId: job.classId,
    customPrompt: job.customPrompt,
    difficulty: job.difficulty,
    price: job.price.toNumber(),
    themePoolText: Array.isArray(job.themePool) ? job.themePool.join('\n') : '',
    lastRunAt: job.lastRunAt?.toISOString() ?? null,
    lastStatus: job.lastStatus ?? null,
    lastMessage: job.lastMessage ?? null,
    lastLessonId: job.lastLessonId ?? null,
    teacher: job.teacher,
    class: job.class,
    runs: job.runs.map((run) => ({
      id: run.id,
      runDate: run.runDate.toISOString(),
      status: run.status,
      message: run.message ?? null,
      lessonId: run.lessonId ?? null,
      createdAt: run.createdAt.toISOString(),
    })),
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
          <h1 className="text-3xl font-bold">Automation</h1>
          <p className="mt-2 text-sm text-slate-400">
            Manage recurring AI jobs and token-gated automation access from one place.
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
      <DailyLessonAutomationManager
        teachers={teacherOptions}
        classes={classes}
        jobs={serializableJobs}
      />
      <AdminAutomationManager teachers={teacherOptions} initialTokens={serializableTokens} />
    </div>
  );
}
