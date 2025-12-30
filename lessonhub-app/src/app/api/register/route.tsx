// file: src/app/api/register/route.tsx
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { getEmailTemplateByName } from "@/actions/adminActions";
import { createButton } from "@/lib/email-templates";
import { sendEmail } from "@/lib/email-templates.server";
import { Role } from '@prisma/client';
import { verifyRegisterChallenge } from '@/lib/registerChallenge';

const DEFAULT_DEADLINE_HOURS = 36;
const FREE_CLASS_NAME = "New Free Users";

async function sendAdminNotifications(newUser: { name: string | null; email: string }) {
    const admins = await prisma.user.findMany({ where: { role: Role.ADMIN } });
    if (admins.length === 0) return;

    const template = await getEmailTemplateByName('new_user_admin');
    if (!template) return;

    for (const admin of admins) {
        if (admin.email) {
            try {
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
    const {
      name,
      email,
      password,
      referralCode,
      honeypot,
      challengeAnswer,
      challengeToken,
      challengeSignature,
    } = body;

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Missing name, email, or password" }, { status: 400 });
    }

    if (typeof honeypot === 'string' && honeypot.trim().length > 0) {
      console.warn("[register:api] Honeypot field detected. Blocking potential bot submission.");
      return NextResponse.json({ error: "Unable to process request" }, { status: 400 });
    }

    const challengeValidation = verifyRegisterChallenge({
      answer: Number(challengeAnswer),
      token: challengeToken,
      signature: challengeSignature,
    });

    if (!challengeValidation.isValid) {
      console.warn("[register:api] Math challenge failed:", challengeValidation.reason);
      return NextResponse.json({ error: "Anti-spam check failed" }, { status: 400 });
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

    const user = await prisma.$transaction(async (tx) => {
        const now = new Date();
        const defaultDeadline = new Date(now.getTime() + DEFAULT_DEADLINE_HOURS * 60 * 60 * 1000);

        const allTeachers = await tx.user.findMany({
            where: { role: Role.TEACHER },
            select: { id: true },
            orderBy: { id: 'asc' },
        });
        const primaryTeacherId = referrer?.role === Role.TEACHER
          ? referrer.id
          : allTeachers[0]?.id;

        let freeClassId: string | null = null;
        if (primaryTeacherId) {
          const existingClass = await tx.class.findFirst({
            where: { name: FREE_CLASS_NAME, teacherId: primaryTeacherId },
            select: { id: true },
          });
          const freeClass = existingClass
            ? existingClass
            : await tx.class.create({
                data: {
                  name: FREE_CLASS_NAME,
                  teacherId: primaryTeacherId,
                },
                select: { id: true },
              });
          freeClassId = freeClass.id;
        }

        const newUser = await tx.user.create({
            data: {
                email,
                name,
                hashedPassword,
                referrerId: referrer?.id,
            },
        });

        // Build teacher links (with class if available)
        const teacherLinks = new Map<string, { teacherId: string; classId: string | null }>();

        if (referrer && referrer.role === Role.TEACHER) {
            teacherLinks.set(referrer.id, { teacherId: referrer.id, classId: referrer.id === primaryTeacherId ? freeClassId : null });
        } else {
            for (const teacher of allTeachers) {
                teacherLinks.set(teacher.id, { teacherId: teacher.id, classId: teacher.id === primaryTeacherId ? freeClassId : null });
            }
        }

        if (teacherLinks.size > 0) {
            await tx.teachersForStudent.createMany({
                data: Array.from(teacherLinks.values()).map((link) => ({
                    studentId: newUser.id,
                    teacherId: link.teacherId,
                    classId: link.classId,
                })),
                skipDuplicates: true,
            });
        }

        // Auto-assign free-for-all lessons so new students see them immediately
        const freeLessons = await tx.lesson.findMany({
            where: { isFreeForAll: true },
            select: { id: true },
        });

        if (freeLessons.length > 0) {
            await tx.assignment.createMany({
                data: freeLessons.map((lesson) => ({
                    lessonId: lesson.id,
                    studentId: newUser.id,
                    deadline: defaultDeadline,
                    originalDeadline: defaultDeadline,
                    startDate: now,
                    notifyOnStartDate: false,
                })),
                skipDuplicates: true,
            });
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
