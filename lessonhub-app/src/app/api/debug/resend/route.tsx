// file: src/app/api/debug/resend/route.tsx
export const runtime = 'edge';

import { NextRequest, NextResponse } from "next/server";
import { render } from '@react-email/render';
import WelcomeEmail from '@/emails/WelcomeEmail';

export async function POST(req: NextRequest) {
  try {
    const { to, name = "Test User" } = await req.json();

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: "Missing RESEND_API_KEY" }, { status: 500 });
    }
    if (!process.env.EMAIL_FROM) {
      return NextResponse.json({ error: "Missing EMAIL_FROM" }, { status: 500 });
    }
    if (!to) {
      return NextResponse.json({ error: "Missing 'to' field" }, { status: 400 });
    }

    // ✅ Await the render so we get a string
    const emailHtml = await render(
      <WelcomeEmail userName={name} userEmail={to} />,
      { pretty: true } // optional
    );

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to,
        subject: `Welcome to LessonHub, ${name}!`,
        html: emailHtml, // now a string ✅
      }),
    });

    const body = await res.json();
    if (!res.ok) {
      console.error("[resend:debug] error", res.status, body);
      return NextResponse.json({ error: body }, { status: res.status });
    }
    return NextResponse.json({ ok: true, body });
  } catch (e: any) {
    console.error("[resend:debug] exception", e?.message || e);
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}