// file: src/actions/cronActions.tsx
'use server';

// Admin-only server-action entry points for the cron jobs. The job bodies live in
// @/lib/cronJobs; the CRON_SECRET routes under /api/cron call them directly.
import { authorizeAdmin } from '@/lib/authz';
import * as cronJobs from '@/lib/cronJobs';

async function asAdmin<T>(run: () => Promise<T>) {
  const authz = await authorizeAdmin();
  if (!authz.ok) return { success: false as const, message: authz.error };
  return run();
}

export async function failExpiredAssignments(graceHours?: number) {
  return asAdmin(() => cronJobs.failExpiredAssignments(graceHours));
}

export async function sendDeadlineReminders() {
  return asAdmin(() => cronJobs.sendDeadlineReminders());
}

export async function sendStartDateNotifications(referenceDate?: Date, lookaheadMinutes?: number) {
  return asAdmin(() => cronJobs.sendStartDateNotifications(referenceDate, lookaheadMinutes));
}

export async function sendCronTestEmail() {
  return asAdmin(() => cronJobs.sendCronTestEmail());
}

export async function sendPaymentReminders() {
  return asAdmin(() => cronJobs.sendPaymentReminders());
}

export async function sendWeeklySummaries(options?: { referenceDate?: Date; force?: boolean }) {
  return asAdmin(() => cronJobs.sendWeeklySummaries(options));
}
