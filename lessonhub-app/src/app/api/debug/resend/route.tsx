// file: src/app/api/debug/resend/route.tsx
// remove the underscore to enable the route for testing
// test using: curl -X POST http://localhost:3000/api/debug/resend \
// -H "Content-Type: application/json" \
// -d '{"to": "example@example.com", "subject": "Resend smoke test"}'
export const runtime = 'nodejs'; // Use Node.js runtime for robust rendering

import { NextRequest, NextResponse } from "next/server";
import { getEmailTemplateByName } from "@/actions/adminActions";
import { replacePlaceholders, createButton } from "@/lib/email-templates";

export async function POST(req: NextRequest) {
  try {
    const headers = req.headers;
    const protocol = headers.get('x-forwarded-proto') || 'http';
    const host = headers.get('host') || 'localhost:3000';
    const signInUrl = `${protocol}://${host}/signin`;
    const { to, name = "Test User" } = await req.json();

    if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM || !to) {
      return NextResponse.json({ error: "Missing required environment variables or 'to' field" }, { status: 400 });
    }
    
    const template = await getEmailTemplateByName('welcome');
    if (!template) {
        return NextResponse.json({ error: "Welcome email template not found." }, { status: 500 });
    }

    const subject = replacePlaceholders(template.subject, { userName: name });
    const body = replacePlaceholders(template.body, {
        userName: name,
        button: createButton('Sign In', signInUrl),
    });

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
        html: body,
      }),
    });

    const responseBody = await res.json();
    if (!res.ok) {
      console.error("[resend:debug] error", res.status, responseBody);
      return NextResponse.json({ error: responseBody }, { status: res.status });
    }
    return NextResponse.json({ ok: true, body: responseBody });
  } catch (e: any) {
    console.error("[resend:debug] exception", e?.message || e);
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}