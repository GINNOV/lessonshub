// file: src/app/api/cron/daily/route.tsx
import { NextResponse } from 'next/server';
import { failExpiredAssignments, sendDeadlineReminders, sendStartDateNotifications, sendWeeklySummaries } from '@/actions/cronActions';

export async function GET() {
  try {
    // We can run these in parallel as they don't depend on each other
    const [remindersResult, startDateResult, weeklyResult, failExpiredResult] = await Promise.all([
      sendDeadlineReminders(),
      sendStartDateNotifications(),
      sendWeeklySummaries(),
      failExpiredAssignments(),
    ]);
    
    return NextResponse.json({
      ok: true,
      remindersResult,
      startDateResult,
      weeklyResult,
      failExpiredResult,
    });
  } catch (error) {
    console.error("Cron job failed:", error);
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}
