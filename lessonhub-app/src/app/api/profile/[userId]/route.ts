// file: src/app/api/profile/[userId]/route.ts
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";
import { revalidatePath } from 'next/cache';

export async function PATCH(
  request: Request,
  { params }: { params: { userId: string } }
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== Role.ADMIN) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  try {
    const { userId } = params;
    const body = await request.json();
    const { name, image } = body;

    await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        image,
      },
    });
    
    revalidatePath('/admin/users');

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("ADMIN_PROFILE_UPDATE_ERROR", error);
    return new NextResponse(JSON.stringify({ error: "Failed to update profile." }), { status: 500 });
  }
}