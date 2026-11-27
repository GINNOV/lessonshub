// file: src/app/api/admin/users/[userId]/route.ts

import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";
import { authorizeFullAdmin } from "@/lib/authz";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;

  // Changing roles can grant ADMIN, so admin-portal access alone is not enough.
  const authz = await authorizeFullAdmin();
  if (!authz.ok) {
    return new NextResponse(JSON.stringify({ error: authz.error }), {
      status: authz.status,
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
