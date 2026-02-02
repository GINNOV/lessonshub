// file: src/app/api/profile/[userId]/route.ts
import { auth } from "@/auth";
import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { hasAdminPrivileges } from "@/lib/authz";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();

  try {
    const { userId } = await params; // Correctly await the params
    const body = await request.json();
    const {
      name,
      image,
      timeZone,
      gender,
      weeklySummaryOptOut,
      lessonAutoSaveOptOut,
      studentBio,
      uiLanguage,
      aiApiKey,
    } = body;

    if (session?.user?.id !== userId && !hasAdminPrivileges(session?.user)) {
        return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    let normalizedAiKey: string | null | undefined = undefined;
    if (aiApiKey !== undefined) {
      const target = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      if (!target) {
        return new NextResponse(JSON.stringify({ error: "User not found" }), { status: 404 });
      }
      if (target.role !== "STUDENT") {
        return new NextResponse(JSON.stringify({ error: "AI key is only available for students." }), {
          status: 403,
        });
      }
      if (typeof aiApiKey === "string") {
        const trimmedKey = aiApiKey.trim();
        normalizedAiKey = trimmedKey.length ? trimmedKey : null;
      } else {
        normalizedAiKey = null;
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        image,
        timeZone,
        gender,
        weeklySummaryOptOut,
        lessonAutoSaveOptOut,
        studentBio,
        ...(uiLanguage && ['device', 'en', 'it'].includes(uiLanguage) ? { uiLanguage } : {}),
        ...(normalizedAiKey !== undefined ? { aiApiKey: normalizedAiKey } : {}),
      },
    });

    return NextResponse.json(updatedUser, { status: 200 });
  } catch (error) {
    console.error("PROFILE_UPDATE_ERROR", error);
    return new NextResponse(
      JSON.stringify({ error: "Failed to update profile" }),
      { status: 500 }
    );
  }
}
