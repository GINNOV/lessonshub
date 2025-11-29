import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== Role.STUDENT) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let count = 1;
  try {
    const body = await request.json();
    if (body && typeof body.count === "number" && Number.isFinite(body.count) && body.count > 0) {
      count = Math.floor(body.count);
    }
  } catch {
    // ignore parsing errors; default count = 1
  }

  const student = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { readAlongPoints: true },
  });

  const available = student?.readAlongPoints ?? 0;
  if (available <= 0) {
    return NextResponse.json({ success: false, remaining: 0 }, { status: 200 });
  }

  const spendAmount = Math.min(count, available);
  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: { readAlongPoints: { decrement: spendAmount } },
    select: { readAlongPoints: true },
  });

  return NextResponse.json({
    success: true,
    spent: spendAmount,
    remaining: updated.readAlongPoints,
  });
}
