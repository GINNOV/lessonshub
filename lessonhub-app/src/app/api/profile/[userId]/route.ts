// file: src/app/api/profile/[userId]/route.ts
import { auth } from "@/auth";
import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();

  try {
    const { userId } = await params; // Correctly await the params
    const body = await request.json();
    const { name, image, timeZone, gender, weeklySummaryOptOut, studentBio } = body;

    if (session?.user?.id !== userId && session?.user?.role !== Role.ADMIN) {
        return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        image,
        timeZone,
        gender,
        weeklySummaryOptOut,
        studentBio,
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
