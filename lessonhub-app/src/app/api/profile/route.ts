// file: src/app/api/profile/route.ts

import { auth } from "@/auth";
import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  try {
    const body = await request.json();
    const { name, image, timeZone, gender, weeklySummaryOptOut } = body as { name?: string; image?: string; timeZone?: string; gender?: 'MALE' | 'FEMALE' | 'BINARY'; weeklySummaryOptOut?: boolean };

    const dataToUpdate: { name?: string; image?: string; timeZone?: string; gender?: 'MALE' | 'FEMALE' | 'BINARY'; weeklySummaryOptOut?: boolean } = {};
    if (name) dataToUpdate.name = name;
    if (image) dataToUpdate.image = image;
    if (timeZone) dataToUpdate.timeZone = timeZone;
    if (gender) dataToUpdate.gender = gender;
    if (typeof weeklySummaryOptOut === 'boolean') dataToUpdate.weeklySummaryOptOut = weeklySummaryOptOut;

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
