import { NextRequest, NextResponse } from 'next/server';
import { failExpiredAssignments, sendStartDateNotifications } from '@/actions/cronActions';
import { isAuthorizedCronRequest } from '@/lib/cronAuth';

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized cron request.' }, { status: 401 });
  }

  try {
    const [startResult, failResult] = await Promise.all([
      sendStartDateNotifications(undefined, 60),
      failExpiredAssignments(),
    ]);
    return NextResponse.json({ ok: true, startResult, failResult });
  } catch (error) {
    console.error('Start-date cron job failed:', error);
    return NextResponse.json(
      { ok: false, error: (error as Error).message },
      { status: 500 },
    );
  }
}
