// file: src/app/api/assignments/route.tsx
import { auth } from "@/auth";
import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";
import { getEmailTemplateByName } from "@/actions/adminActions";
import { createButton, sendEmail } from "@/lib/email-templates";
import { revalidatePath } from "next/cache";

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
    const { lessonId, studentIdsToAssign, studentIdsToUnassign, deadline, notifyStudents } = body;

    if (!lessonId) {
      return new NextResponse(JSON.stringify({ error: "Lesson ID is required" }), { status: 400 });
    }
    
    if (studentIdsToAssign?.length > 0 && !deadline) {
        return new NextResponse(JSON.stringify({ error: "Deadline is required for new assignments" }), { status: 400 });
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
      
      if (notifyStudents) {
        const template = await getEmailTemplateByName('new_assignment');
        if (template) {
            for (const student of students) {
                if (student.email) {
                  try {
                      await sendEmail({
                        to: student.email,
                        templateName: 'new_assignment',
                        data: {
                          studentName: student.name || 'student',
                          teacherName: session.user.name || 'your teacher',
                          lessonTitle: lesson.title,
                          deadline: new Date(deadline).toLocaleString(),
                          button: createButton('Start Lesson', `${getBaseUrl(request)}/my-lessons`, template.buttonColor || undefined),
                        }
                      });
                  } catch (emailError) {
                      console.error(`An unexpected error occurred while sending assignment email to ${student.email}:`, emailError);
                  }
            }
          }
        }
      }
    }
    
    if (operations.length > 0) {
      await prisma.$transaction(operations);
    }

    // ✅ THIS IS THE FIX: Revalidate the necessary paths
    revalidatePath('/my-lessons'); // Revalidates the student dashboard
    revalidatePath(`/dashboard/assign/${lessonId}`); // Revalidates the teacher's assignment page

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("ASSIGNMENT_UPDATE_ERROR", error);
    return new NextResponse(JSON.stringify({ error: "Failed to update assignments" }), { status: 500 });
  }
}