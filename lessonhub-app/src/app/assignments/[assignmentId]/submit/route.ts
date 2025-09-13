// file: src/app/api/assignments/[assignmentId]/submit/route.ts
export const runtime = 'nodejs';

import { auth } from "@/auth";
import { NextResponse, NextRequest } from "next/server";
import { submitMultiChoiceAssignment } from "@/actions/lessonActions";
import { Role } from "@prisma/client";

export async function POST(
  request: NextRequest,
  { params }: { params: { assignmentId: string } }
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== Role.STUDENT) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  try {
    const { assignmentId } = params;
    const body = await request.json();
    const { answers } = body;

    const result = await submitMultiChoiceAssignment(assignmentId, session.user.id, answers);
    
    if (!result.success) {
      return new NextResponse(JSON.stringify({ error: result.error }), { status: 400 });
    }

    return NextResponse.json(result.data);

  } catch (error) {
    return new NextResponse(JSON.stringify({ error: "Failed to submit assignment" }), { status: 500 });
  }
}