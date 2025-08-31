// file: src/app/api/_debug/resend/route.ts
// to test use the curl below and remove the _ from the folder name
// curl -X POST http://localhost:3000/api/debug/resend \
// -H "Content-Type: application/json" \
// -d '{"to": "doe@example.com", "subject": "Resend smoke test"}'
export const runtime = 'edge'; // works with fetch

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { to, subject = "Resend debug", html = "<strong>Hi from Resend</strong>" } = await req.json();

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: "Missing RESEND_API_KEY" }, { status: 500 });
    }
    if (!process.env.EMAIL_FROM) {
      return NextResponse.json({ error: "Missing EMAIL_FROM" }, { status: 500 });
    }
    if (!to) {
      return NextResponse.json({ error: "Missing 'to'" }, { status: 400 });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to,
        subject,
        html,
        text: "Plaintext fallback",
      }),
    });

    const body = await res.text();
    if (!res.ok) {
      console.error("[resend:debug] error", res.status, body);
      return NextResponse.json({ error: body }, { status: 502 });
    }
    return NextResponse.json({ ok: true, body: body ? JSON.parse(body) : null });
  } catch (e: any) {
    console.error("[resend:debug] exception", e?.message || e);
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
