// file: src/app/api/register/route.tsx

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { render } from '@react-email/render';
import NewAccountEmail from '@/emails/NewAccountEmail';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    if (!email || !password) {
      return new NextResponse(JSON.stringify({ error: "Email and password are required" }), { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return new NextResponse(JSON.stringify({ error: "User with this email already exists" }), { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        hashedPassword: hashedPassword,
      },
    });
    
    // --- New Email Sending Logic with Debugging ---
    try {
      console.log(`[register:email] Rendering welcome email for: ${user.email}`);
      const emailHtml = render(
        <NewAccountEmail userName={user.name} userEmail={user.email} />
      );

      // --- Defensive Check & Logging ---
      console.log("[register:email] Rendered HTML type:", typeof emailHtml);
      if (typeof emailHtml !== 'string') {
        throw new Error(`Rendered email is not a string. Render output type was: ${typeof emailHtml}`);
      }
      
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM,
          to: user.email,
          subject: "Welcome to LessonHub!",
          html: emailHtml,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json();
        console.error("[register:email] Resend API Error:", errorBody);
      } else {
        console.log("[register:email] Welcome email sent successfully.");
      }

    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError);
      // We don't block registration if the email fails, but we should log it.
    }
    // --- End of Email Sending Logic ---

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("REGISTRATION ERROR", error);
    return new NextResponse(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}

