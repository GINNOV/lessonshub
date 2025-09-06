// file: src/app/api/register/route.tsx
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { render } from '@react-email/render';
import WelcomeEmail from '@/emails/WelcomeEmail';
import NewUserAdminNotificationEmail from '@/emails/NewUserAdminNotificationEmail';
import { Role } from '@prisma/client';

async function sendAdminNotifications(newUser: { name: string | null; email: string }) {
    const admins = await prisma.user.findMany({ where: { role: Role.ADMIN } });
    if (admins.length === 0) return;

    for (const admin of admins) {
        if (admin.email) {
            try {
                const emailHtml = await render(
                    <NewUserAdminNotificationEmail
                        adminName={admin.name}
                        newUserName={newUser.name}
                        newUserEmail={newUser.email}
                    />
                );

                await fetch("https://api.resend.com/emails", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        from: process.env.EMAIL_FROM,
                        to: admin.email,
                        subject: `[LessonHUB] New User Sign-Up: ${newUser.name || newUser.email}`,
                        html: emailHtml,
                    }),
                });
            } catch (error) {
                console.error(`Failed to send new user notification to admin ${admin.email}:`, error);
            }
        }
    }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
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

    // --- Send Welcome Email to User ---
    const headers = req.headers;
    const protocol = headers.get('x-forwarded-proto') || 'http';
    const host = headers.get('host') || 'localhost:3000';
    const signInUrl = `${protocol}://${host}/signin`;

    const emailHtml = await render(
      <WelcomeEmail userName={user.name} userEmail={user.email} signInUrl={signInUrl} />
    );
    
    const resendPayload = {
      from: process.env.EMAIL_FROM,
      to: user.email,
      subject: `Welcome to LessonHub, ${user.name}!`,
      html: emailHtml,
    };
    
    if (resendPayload.to) {
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
      }
    }

    // --- Send Notification Email to Admins ---
    await sendAdminNotifications(user);

    return NextResponse.json(user, { status: 201 });

  } catch (error: any) {
    console.error("[register:api] CATCH BLOCK ERROR:", error);
    if (error.code === 'P2002') { 
      return NextResponse.json({ error: "User with this email already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}