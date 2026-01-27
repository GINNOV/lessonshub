// file: src/app/api/my-lessons/route.ts
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { Role, AssignmentStatus, PointReason } from "@prisma/client";
import { getAssignmentsForStudent } from "@/actions/lessonActions";
import prisma from "@/lib/prisma";

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
    const purchasedAssignmentIds = new Set(
      marketplacePurchases
        .map((purchase) => purchase.assignmentId)
        .filter((id): id is string => Boolean(id)),
    );

    const submittedStatuses = new Set<AssignmentStatus>([
        AssignmentStatus.COMPLETED,
        AssignmentStatus.GRADED,
        AssignmentStatus.FAILED,
    ]);

    const serializableAssignments = assignments.map(assignment => {
        const {
          _count,
          assignments: lessonAssignments,
          price,
          teacher,
          ...restOfLesson
        } = assignment.lesson;
  
        const submittedCount = (lessonAssignments || []).filter((lessonAssignment) =>
          submittedStatuses.has(lessonAssignment.status)
        ).length;
  
        return {
          ...assignment,
          pointsAwarded: assignment.pointsAwarded ?? 0,
          marketplacePurchased: purchasedAssignmentIds.has(assignment.id),
          teacherAnswerComments: (assignment as any).teacherAnswerComments ?? null,
          lesson: {
            ...restOfLesson,
            price: price.toNumber(),
            isFreeForAll: (restOfLesson as any).isFreeForAll ?? false,
            completionCount: _count.assignments,
            submittedCount,
            teacher: teacher ? {
                ...teacher,
                defaultLessonPrice: teacher.defaultLessonPrice?.toNumber() ?? null,
            } : null,
          },
        }
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
