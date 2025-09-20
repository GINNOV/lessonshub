// file: src/app/api/assignments/route.ts
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
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  try {
    const body = await request.json();
    const { lessonId, studentIdsToAssign, studentIdsToUpdate, studentIdsToUnassign, notifyStudents } = body;

    if (!lessonId) {
      return new NextResponse(JSON.stringify({ error: "Lesson ID is required" }), { status: 400 });
    }

    // --- SEQUENTIAL DATABASE OPERATIONS FOR RELIABILITY ---

    // 1. Unassign students
    if (studentIdsToUnassign && studentIdsToUnassign.length > 0) {
      await prisma.assignment.deleteMany({
        where: { lessonId, studentId: { in: studentIdsToUnassign } },
      });
    }

    // 2. Update existing assignments
    if (studentIdsToUpdate && studentIdsToUpdate.length > 0) {
      for (const assignment of studentIdsToUpdate) {
        await prisma.assignment.update({
          where: { lessonId_studentId: { lessonId, studentId: assignment.studentId } },
          data: { deadline: new Date(assignment.deadline) },
        });
      }
    }
    
    // 3. Assign to new students
    if (studentIdsToAssign && studentIdsToAssign.length > 0) {
      const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
      if (!lesson) {
        return new NextResponse(JSON.stringify({ error: "Lesson not found" }), { status: 404 });
      }

      const studentsToAssign = await prisma.user.findMany({
        where: { id: { in: studentIdsToAssign.map((a: any) => a.studentId) } }
      });
      
      const assignmentsData = studentIdsToAssign.map((assignment: any) => ({
        lessonId,
        studentId: assignment.studentId,
        deadline: new Date(assignment.deadline),
      }));

      await prisma.assignment.createMany({ data: assignmentsData, skipDuplicates: true });
      
      // 4. Notify new students
      if (notifyStudents) {
        const template = await getEmailTemplateByName('new_assignment');
        if (template) {
            for (const student of studentsToAssign) {
                if (student.email) {
                  const assignmentData = studentIdsToAssign.find((a: any) => a.studentId === student.id);
                  try {
                      await sendEmail({
                        to: student.email,
                        templateName: 'new_assignment',
                        data: {
                          studentName: student.name || 'student',
                          teacherName: session.user.name || 'your teacher',
                          lessonTitle: lesson.title,
                          deadline: new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(assignmentData.deadline)),
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

    revalidatePath(`/dashboard/assign/${lessonId}`);
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error("ASSIGNMENT_UPDATE_ERROR", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new NextResponse(JSON.stringify({ error: "Failed to update assignments.", details: errorMessage }), { status: 500 });
  }
}