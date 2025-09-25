// file: src/app/api/cron/monthly/route.tsx
import { NextResponse } from 'next/server';
import { sendPaymentReminders } from '@/actions/cronActions';

export async function GET() {
  try {
    const result = await sendPaymentReminders();
    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (error) {
    console.error("Monthly cron job failed:", error);
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}