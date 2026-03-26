// file: src/app/api/my-lessons/route.ts
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { Role, PointReason } from "@prisma/client";
import { getAssignmentsForStudent } from "@/actions/lessonActions";
import prisma from "@/lib/prisma";
import { EXTENSION_POINT_COST } from "@/lib/lessonExtensions";
import { serializeStudentAssignments } from "@/lib/serializers/assignment";

export async function GET() {
  const session = await auth();

  if (!session || !session.user || session.user.role !== Role.STUDENT) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  try {
    const assignments = await getAssignmentsForStudent(session.user.id);
    const assignmentIds = assignments.map((assignment) => assignment.id);
    const marketplacePurchases = assignmentIds.length
      ? await prisma.pointTransaction.findMany({
          where: {
            userId: session.user.id,
            reason: PointReason.MARKETPLACE_PURCHASE,
            assignmentId: { in: assignmentIds },
          },
          select: { assignmentId: true },
        })
      : [];
    const extensionTransactions = assignmentIds.length
      ? await prisma.pointTransaction.findMany({
          where: {
            userId: session.user.id,
            assignmentId: { in: assignmentIds },
            points: -EXTENSION_POINT_COST,
            note: { contains: "Lesson extension" },
          },
          select: { assignmentId: true },
        })
      : [];
    const purchasedAssignmentIds = new Set(
      marketplacePurchases
        .map((purchase) => purchase.assignmentId)
        .filter((id): id is string => Boolean(id)),
    );
    const extendedAssignmentIds = new Set(
      extensionTransactions
        .map((transaction) => transaction.assignmentId)
        .filter((id): id is string => Boolean(id)),
    );

    const serializableAssignments = serializeStudentAssignments(assignments, {
      marketplacePurchasedIds: purchasedAssignmentIds,
      extendedAssignmentIds: extendedAssignmentIds,
    });

    return NextResponse.json(serializableAssignments);
  } catch (error) {
    console.error("Error fetching student assignments:", error);
    return new NextResponse(
      JSON.stringify({ error: "Failed to fetch assignments" }),
      { status: 500 }
    );
  }
}
