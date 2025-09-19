// file: src/app/api/register/route.tsx
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { getEmailTemplateByName } from "@/actions/adminActions";
import { replacePlaceholders, createButton, sendEmail } from "@/lib/email-templates";
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

                // Using the imported sendEmail function
                await sendEmail({
                    to: admin.email,
                    templateName: 'new_user_admin',
                    data: {
                        adminName: admin.name || 'Admin',
                        newUserName: newUser.name || 'Not provided',
                        newUserEmail: newUser.email,
                    }
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
    const { name, email, password, referralCode } = body;

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Missing name, email, or password" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 409 });
    }

    let referrer = null;
    if (referralCode) {
      referrer = await prisma.user.findUnique({ where: { referralCode: referralCode } });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Use a transaction to ensure user creation and teacher assignment are atomic
    const user = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
            data: {
                email,
                name,
                hashedPassword,
                referrerId: referrer?.id,
            },
        });

        if (referrer && referrer.role === Role.TEACHER) {
            // Assign student only to the referring teacher
            await tx.teachersForStudent.create({
                data: {
                    studentId: newUser.id,
                    teacherId: referrer.id,
                },
            });
        } else {
            // Assign student to all teachers if there's no referrer or referrer is not a teacher
            const allTeachers = await tx.user.findMany({
                where: { role: Role.TEACHER },
            });

            if (allTeachers.length > 0) {
                await tx.teachersForStudent.createMany({
                    data: allTeachers.map((teacher) => ({
                        studentId: newUser.id,
                        teacherId: teacher.id,
                    })),
                });
            }
        }
        return newUser;
    });

    const signInUrl = `${new URL(req.url).origin}/signin`;
    await sendEmail({
        to: user.email,
        templateName: 'welcome',
        data: {
            userName: user.name || 'there',
            button: createButton('Sign In to Your Account', signInUrl),
        }
    });

    await sendAdminNotifications(user);
    
    if (referrer && referrer.email) {
      const teachers = await prisma.user.findMany({ where: { role: Role.TEACHER } });

      await sendEmail({
        to: referrer.email,
        templateName: 'new_referral_referrer',
        data: {
          referrerName: referrer.name || 'a user',
          newStudentName: user.name || 'A new student',
          button: createButton('View Your Dashboard', `${new URL(req.url).origin}/dashboard`),
        }
      });

      for (const teacher of teachers) {
        if (teacher.email) {
          await sendEmail({
            to: teacher.email,
            templateName: 'new_referral_teacher',
            data: {
              teacherName: teacher.name || 'Teacher',
              newStudentName: user.name || 'A new student',
              referrerName: referrer.name || 'a user',
            }
          });
        }
      }
    }

    return NextResponse.json(user, { status: 201 });

  } catch (error: any) {
    console.error("[register:api] CATCH BLOCK ERROR:", error);
    if (error.code === 'P2002') { 
      return NextResponse.json({ error: "User with this email already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
