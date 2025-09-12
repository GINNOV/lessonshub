// file: src/app/api/cron/test/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { sendCronTestEmail } from '@/actions/cronActions';
import { auth } from '@/auth';
import { Role } from '@prisma/client';

export async function POST() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sendCronTestEmail();

  if (result.success) {
    return NextResponse.json({ message: result.message });
  } else {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
}
