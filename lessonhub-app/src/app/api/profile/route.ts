// file: src/app/api/profile/route.ts

import { auth } from "@/auth";
import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        timeZone: true,
        weeklySummaryOptOut: true,
        gender: true,
        lastSeen: true,
        isPaying: true,
        isSuspended: true,
        isTakingBreak: true,
        totalPoints: true,
        studentBio: true,
      },
    });

    if (!user) {
      return new NextResponse(JSON.stringify({ error: "User not found" }), {
        status: 404,
      });
    }

    const loginEvents = await prisma.loginEvent.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        lesson: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    const loginHistory = loginEvents.map((event) => ({
      id: event.id,
      timestamp: event.createdAt.toISOString(),
      lessonId: event.lessonId,
      lessonTitle: event.lesson?.title ?? null,
    }));

    return NextResponse.json(
      {
        user: {
          ...user,
          lastSeen: user.lastSeen?.toISOString() ?? null,
        },
        loginHistory,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("PROFILE_GET_ERROR", error);
    return new NextResponse(
      JSON.stringify({ error: "Failed to fetch profile" }),
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  try {
    const body = await request.json();
    const {
      name,
      image,
      timeZone,
      gender,
      weeklySummaryOptOut,
      studentBio,
      isTakingBreak,
      newPassword,
    } = body as {
      name?: string;
      image?: string;
      timeZone?: string;
      gender?: 'MALE' | 'FEMALE' | 'BINARY';
      weeklySummaryOptOut?: boolean;
      studentBio?: string | null;
      isTakingBreak?: boolean;
      newPassword?: string;
    };

    const dataToUpdate: {
      name?: string;
      image?: string;
      timeZone?: string;
      gender?: 'MALE' | 'FEMALE' | 'BINARY';
      weeklySummaryOptOut?: boolean;
      studentBio?: string | null;
      isTakingBreak?: boolean;
      hashedPassword?: string;
    } = {};
    if (name) dataToUpdate.name = name;
    if (image) dataToUpdate.image = image;
    if (timeZone) dataToUpdate.timeZone = timeZone;
    if (gender) dataToUpdate.gender = gender;
    if (typeof weeklySummaryOptOut === 'boolean') dataToUpdate.weeklySummaryOptOut = weeklySummaryOptOut;
    if (studentBio !== undefined) dataToUpdate.studentBio = studentBio;
    if (typeof isTakingBreak === 'boolean') dataToUpdate.isTakingBreak = isTakingBreak;
    if (typeof newPassword === 'string' && newPassword.length >= 8) {
      dataToUpdate.hashedPassword = await bcrypt.hash(newPassword, 12);
    } else if (typeof newPassword === 'string' && newPassword.length > 0 && newPassword.length < 8) {
      return new NextResponse(JSON.stringify({ error: "Password must be at least 8 characters." }), {
        status: 400,
      });
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return new NextResponse(JSON.stringify({ error: "No fields to update" }), {
        status: 400,
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: dataToUpdate,
    });

    return NextResponse.json(updatedUser, { status: 200 });
  } catch (error) {
    return new NextResponse(
      JSON.stringify({ error: "Failed to update profile" }),
      { status: 500 }
    );
  }
}
