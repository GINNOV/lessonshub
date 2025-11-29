import { NextResponse } from 'next/server';
import { sendStartDateNotifications } from '@/actions/cronActions';

export async function GET() {
  try {
    const result = await sendStartDateNotifications(undefined, 60);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error('Start-date cron job failed:', error);
    return NextResponse.json(
      { ok: false, error: (error as Error).message },
      { status: 500 },
    );
  }
}
