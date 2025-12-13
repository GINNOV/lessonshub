import { NextResponse } from 'next/server';
import { failExpiredAssignments, sendStartDateNotifications } from '@/actions/cronActions';

export async function GET() {
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
