// file: src/app/api/cron/daily/route.tsx
import { NextRequest, NextResponse } from 'next/server';
import { failExpiredAssignments, sendDeadlineReminders, sendStartDateNotifications, sendWeeklySummaries } from '@/actions/cronActions';
import { runDailyLessonAutomations } from '@/lib/dailyLessonAutomation';
import { isAuthorizedCronRequest } from '@/lib/cronAuth';

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized cron request.' }, { status: 401 });
  }

  try {
    // We can run these in parallel as they don't depend on each other
    const [remindersResult, startDateResult, weeklyResult, failExpiredResult, dailyLessonAutomationResult] = await Promise.all([
      sendDeadlineReminders(),
      sendStartDateNotifications(),
      sendWeeklySummaries(),
      failExpiredAssignments(),
      runDailyLessonAutomations(),
    ]);
    
    return NextResponse.json({
      ok: true,
      remindersResult,
      startDateResult,
      weeklyResult,
      failExpiredResult,
      dailyLessonAutomationResult,
    });
  } catch (error) {
    console.error("Cron job failed:", error);
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}
