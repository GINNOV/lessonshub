// file: src/app/api/referrals/lookup/route.ts

import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Missing referral code" }, { status: 400 });
  }

  try {
    const referrer = await prisma.user.findUnique({
      where: { referralCode: code },
      select: { name: true, email: true },
    });

    if (!referrer) {
      return NextResponse.json({ error: "Referral not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        name: referrer.name,
        email: referrer.email,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[referral-lookup] failed to load referral info", error);
    return NextResponse.json({ error: "Unable to load referral info" }, { status: 500 });
  }
}
