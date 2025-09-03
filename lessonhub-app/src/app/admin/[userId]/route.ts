// file: src/app/api/admin/users/[userId]/route.ts

import { auth } from "@/auth";
import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const session = await auth();
  const { userId } = params;

  if (!session?.user?.id || session.user.role !== Role.ADMIN) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  try {
    const body = await request.json();
    const { role } = body;

    if (!role || !Object.values(Role).includes(role)) {
      return new NextResponse(JSON.stringify({ error: "Invalid role" }), { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    return NextResponse.json(updatedUser, { status: 200 });
  } catch (error) {
    console.error("UPDATE_USER_ROLE_ERROR", error);
    return new NextResponse(
      JSON.stringify({ error: "Failed to update user role" }),
      { status: 500 }
    );
  }
}