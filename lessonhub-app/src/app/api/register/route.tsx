// file: src/app/api/register/route.tsx
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { getEmailTemplateByName } from "@/actions/adminActions";
import { replacePlaceholders, createButton } from "@/lib/email-templates";
import { Role } from '@prisma/client';

async function sendAdminNotifications(newUser: { name: string | null; email: string }) {
    const admins = await prisma.user.findMany({ where: { role: Role.ADMIN } });
    if (admins.length === 0) return;

    const template = await getEmailTemplateByName('new_user_admin');
    if (!template) return;

    for (const admin of admins) {
        if (admin.email) {
            try {
                const subject = replacePlaceholders(template.subject, { newUserName: newUser.name || newUser.email });
                const body = replacePlaceholders(template.body, {
                    adminName: admin.name || 'Admin',
                    newUserName: newUser.name || 'Not provided',
                    newUserEmail: newUser.email,
                });

                await fetch("https://api.resend.com/emails", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        from: process.env.EMAIL_FROM,
                        to: admin.email,
                        subject,
                        html: body,
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

    // --- Send Welcome Email to User using Template ---
    const template = await getEmailTemplateByName('welcome');
    if (template) {
        const headers = req.headers;
        const protocol = headers.get('x-forwarded-proto') || 'http';
        const host = headers.get('host') || 'localhost:3000';
        const signInUrl = `${protocol}://${host}/signin`;

        const subject = replacePlaceholders(template.subject, { userName: user.name || '' });
        const body = replacePlaceholders(template.body, {
            userName: user.name || 'there',
            button: createButton('Sign In to Your Account', signInUrl),
        });

        await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                from: process.env.EMAIL_FROM,
                to: user.email,
                subject,
                html: body,
            }),
        });
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