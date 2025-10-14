// file: src/app/api/cron/daily/route.tsx
import { NextResponse } from 'next/server';
import { sendDeadlineReminders, sendStartDateNotifications, sendWeeklySummaries } from '@/actions/cronActions';

export async function GET() {
  try {
    // We can run these in parallel as they don't depend on each other
    const [remindersResult, startDateResult, weeklyResult] = await Promise.all([
      sendDeadlineReminders(),
      sendStartDateNotifications(),
      sendWeeklySummaries(),
    ]);
    
    return NextResponse.json({
      ok: true,
      remindersResult,
      startDateResult,
      weeklyResult,
    });
  } catch (error) {
    console.error("Cron job failed:", error);
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}