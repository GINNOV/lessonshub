// file: src/app/api/debug/resend/route.tsx
// to secure this route add a _ in front of the folder name: _debug; remove to test
// to test use:
// curl -X POST http://localhost:3000/api/debug/resend \
// -H "Content-Type: application/json" \
// -d '{"to": "windrago@gmail.com", "name": "Alex"}'

export const runtime = 'nodejs'; 

import { NextRequest, NextResponse } from "next/server";
import { render } from '@react-email/render';
import WelcomeEmail from '@/emails/WelcomeEmail'; 

export async function POST(req: NextRequest) {
  try {
    // Determine the base URL from the request headers for the "smart" sign-in link
    const headers = req.headers;
    const protocol = headers.get('x-forwarded-proto') || 'http';
    const host = headers.get('host') || 'localhost:3000';
    const signInUrl = `${protocol}://${host}/signin`;

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

    // Await the render function with all the correct component props
    const emailHtml = await render(
      <WelcomeEmail userName={name} userEmail={to} signInUrl={signInUrl} />
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
        html: emailHtml,
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

