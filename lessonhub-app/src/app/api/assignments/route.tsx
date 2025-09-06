// file: src/app/api/assignments/route.tsx
import { auth } from "@/auth";
import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";
import { render } from '@react-email/render';
import NewAssignmentEmail from '@/emails/NewAssignmentEmail';

function getBaseUrl(req: NextRequest): string {
  const headers = req.headers;
  const protocol = headers.get('x-forwarded-proto') || 'http';
  const host = headers.get('host') || 'localhost:3000';
  return `${protocol}://${host}`;
}

export async function PATCH(request: NextRequest) {
  const session = await auth();

  if (!session || !session.user || session.user.role !== Role.TEACHER) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  try {
    const body = await request.json();
    const { lessonId, studentIdsToAssign, studentIdsToUnassign, deadline } = body;

    if (!lessonId || !deadline) {
      return new NextResponse(JSON.stringify({ error: "Lesson ID and deadline are required" }), { status: 400 });
    }

    const operations = [];

    if (studentIdsToUnassign && studentIdsToUnassign.length > 0) {
      const deleteOperation = prisma.assignment.deleteMany({
        where: {
          lessonId: lessonId,
          studentId: { in: studentIdsToUnassign },
        },
      });
      operations.push(deleteOperation);
    }

    if (studentIdsToAssign && studentIdsToAssign.length > 0) {
      const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
      if (!lesson) {
        return new NextResponse(JSON.stringify({ error: "Lesson not found" }), { status: 404 });
      }

      const students = await prisma.user.findMany({
        where: { id: { in: studentIdsToAssign } }
      });

      const assignmentsData = students.map(student => ({
        lessonId: lessonId,
        studentId: student.id,
        deadline: new Date(deadline),
      }));

      const createOperation = prisma.assignment.createMany({
        data: assignmentsData,
        skipDuplicates: true,
      });
      operations.push(createOperation);
      
      const baseUrl = getBaseUrl(request);
    
      for (const student of students) {
        if (student.email) {
            try {
                const assignmentUrl = `${baseUrl}/my-lessons`;
                
                const emailHtml = await render(
                    <NewAssignmentEmail
                    studentName={student.name}
                    lessonTitle={lesson.title}
                    teacherName={session.user.name}
                    deadline={new Date(deadline)}
                    assignmentUrl={assignmentUrl}
                    />
                );

                const emailResponse = await fetch("https://api.resend.com/emails", {
                    method: "POST",
                    headers: {
                    Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
                    "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                    from: process.env.EMAIL_FROM,
                    to: student.email,
                    subject: `New Assignment: ${lesson.title}`,
                    html: emailHtml,
                    }),
                });

                if (emailResponse.ok) {
                    console.log(`Successfully sent new assignment email to ${student.email} for lesson ${lesson.title}`);
                } else {
                    const errorBody = await emailResponse.json();
                    console.error(`Failed to send new assignment email to ${student.email}:`, errorBody);
                }
            } catch (emailError) {
                console.error(`An unexpected error occurred while sending assignment email to ${student.email}:`, emailError);
            }
        }
      }
    }
    
    if (operations.length > 0) {
      await prisma.$transaction(operations);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("ASSIGNMENT_UPDATE_ERROR", error);
    return new NextResponse(JSON.stringify({ error: "Failed to update assignments" }), { status: 500 });
  }
}