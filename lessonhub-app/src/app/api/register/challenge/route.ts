// file: src/app/api/register/challenge/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createRegisterChallenge } from '@/lib/registerChallenge';

export async function GET() {
  try {
    const challenge = createRegisterChallenge();
    return NextResponse.json({
      a: challenge.a,
      b: challenge.b,
      token: challenge.token,
      signature: challenge.signature,
    });
  } catch (error) {
    console.error('[register:challenge] Failed to create math challenge:', error);
    return NextResponse.json({ error: 'Unable to prepare anti-spam check' }, { status: 500 });
  }
}
