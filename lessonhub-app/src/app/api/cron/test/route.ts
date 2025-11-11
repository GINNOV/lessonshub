// file: src/app/api/cron/test/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sendCronTestEmail, sendDeadlineReminders, sendPaymentReminders, sendStartDateNotifications, sendWeeklySummaries } from '@/actions/cronActions';
import { auth } from '@/auth';
import { hasAdminPrivileges } from '@/lib/authz';

type CronTestAction =
  | 'test-email'
  | 'deadline'
  | 'start-date'
  | 'weekly'
  | 'payment';

export async function POST(request: NextRequest) {
 const session = await auth();
 if (!session?.user || !hasAdminPrivileges(session.user)) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 }

 let body: Partial<{ action: CronTestAction; simulateTime?: string; force?: boolean }> = {};
 try {
  body = await request.json();
 } catch {
  body = {};
 }

 const action: CronTestAction = body.action ?? 'test-email';

 switch (action) {
  case 'deadline': {
   const result = await sendDeadlineReminders();
   return NextResponse.json(
    { message: result.message },
    { status: result.success ? 200 : 500 },
   );
  }
  case 'start-date': {
   let referenceDate: Date | undefined;
   if (body.simulateTime) {
    const parsed = new Date(body.simulateTime);
    if (Number.isNaN(parsed.getTime())) {
     return NextResponse.json({ error: 'Invalid simulateTime value.' }, { status: 400 });
    }
    referenceDate = parsed;
   }
   const result = await sendStartDateNotifications(referenceDate);
   return NextResponse.json(
    { message: result.message },
    { status: result.success ? 200 : 500 },
   );
  }
  case 'weekly': {
   let referenceDate: Date | undefined;
   if (body.simulateTime) {
    const parsed = new Date(body.simulateTime);
    if (Number.isNaN(parsed.getTime())) {
     return NextResponse.json({ error: 'Invalid simulateTime value.' }, { status: 400 });
    }
    referenceDate = parsed;
   }
   const result = await sendWeeklySummaries({
    referenceDate,
    force: Boolean(body.force),
   });
   return NextResponse.json(
    { message: result.message },
    { status: result.success ? 200 : 500 },
   );
  }
  case 'payment': {
   const result = await sendPaymentReminders();
   return NextResponse.json(
    { message: result.message },
    { status: result.success ? 200 : 500 },
   );
  }
  case 'test-email':
  default: {
   const result = await sendCronTestEmail();
   return NextResponse.json(
    { message: result.message },
    { status: result.success ? 200 : 500 },
   );
  }
 }
}
