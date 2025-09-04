// file: src/app/api/register/route.tsx
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { render } from '@react-email/render';
import WelcomeEmail from '@/emails/WelcomeEmail';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("[register:api] Received request body:", body); // <-- ADDED LOGGING

    const { name, email, password } = body;

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Missing name, email, or password" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, name, hashedPassword },
    });

    // --- Send Welcome Email ---
    const headers = req.headers;
    const protocol = headers.get('x-forwarded-proto') || 'http';
    const host = headers.get('host') || 'localhost:3000';
    const signInUrl = `${protocol}://${host}/signin`;

    const emailHtml = await render(
      <WelcomeEmail userName={user.name} userEmail={user.email} signInUrl={signInUrl} />
    );
    
    const resendPayload = {
      from: process.env.EMAIL_FROM,
      to: user.email, // This should be the user's email address
      subject: `Welcome to LessonHub, ${user.name}!`,
      html: emailHtml,
    };
    
    console.log("[register:api] Sending payload to Resend:", resendPayload); // <-- ADDED LOGGING

    // Defensive check
    if (!resendPayload.to) {
      console.error("[register:api] The 'to' field is missing before sending email.");
      // We don't return an error to the user here, just log it,
      // as the account was successfully created.
    } else {
      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(resendPayload),
      });

      if (!resendResponse.ok) {
        const errorBody = await resendResponse.json();
        console.error("[register:email] Resend API Error:", errorBody);
        // Silently fail but log the error. The user account is still created.
      }
    }

    return NextResponse.json(user, { status: 201 });

  } catch (error: any) {
    console.error("[register:api] CATCH BLOCK ERROR:", error);
    // Handle Prisma's unique constraint violation for existing users
    if (error.code === 'P2002') { 
      return NextResponse.json({ error: "User with this email already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}