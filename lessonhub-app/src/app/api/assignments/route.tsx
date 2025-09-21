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
    console.log("--- ASSIGNMENT API START ---");
    console.log("Received request body:", JSON.stringify(body, null, 2));

    const { lessonId, studentIdsToAssign, studentIdsToUpdate, studentIdsToUnassign, notifyStudents } = body;

    if (!lessonId) {
      console.error("Validation failed: Lesson ID is required.");
      return new NextResponse(JSON.stringify({ error: "Lesson ID is required" }), { status: 400 });
    }

    // 1. Unassign students
    if (studentIdsToUnassign && studentIdsToUnassign.length > 0) {
      console.log(`Attempting to unassign ${studentIdsToUnassign.length} student(s):`, studentIdsToUnassign);
      await prisma.assignment.deleteMany({
        where: { lessonId, studentId: { in: studentIdsToUnassign } },
      });
      console.log("-> Unassignment successful.");
    } else {
      console.log("No students to unassign.");
    }

    // 2. Update existing assignments
    if (studentIdsToUpdate && studentIdsToUpdate.length > 0) {
      console.log(`Attempting to update deadlines for ${studentIdsToUpdate.length} student(s).`);
      for (const assignment of studentIdsToUpdate) {
        console.log(` -> Updating student ${assignment.studentId} with deadline ${assignment.deadline}`);
        await prisma.assignment.update({
          where: { lessonId_studentId: { lessonId, studentId: assignment.studentId } },
          data: { deadline: new Date(assignment.deadline) },
        });
      }
      console.log("-> Updates successful.");
    } else {
      console.log("No students to update.");
    }
    
    // 3. Assign to new students
    if (studentIdsToAssign && studentIdsToAssign.length > 0) {
      console.log(`Attempting to assign ${studentIdsToAssign.length} new student(s).`);
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

      console.log("Creating new assignments with data:", assignmentsData);
      await prisma.assignment.createMany({ data: assignmentsData, skipDuplicates: true });
      console.log("-> New assignments created successfully.");
      
      // 4. Notify new students
      if (notifyStudents) {
        console.log("Notification flag is true. Preparing to send emails.");
        const template = await getEmailTemplateByName('new_assignment');
        if (template) {
            for (const student of studentsToAssign) {
                if (student.email) {
                  const assignmentData = studentIdsToAssign.find((a: any) => a.studentId === student.id);
                  console.log(` -> Sending email to ${student.email}`);
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
                }
            }
            console.log("-> Emails sent.");
        } else {
            console.warn("Could not find 'new_assignment' email template.");
        }
      } else {
        console.log("Notification flag is false. Skipping emails.");
      }
    } else {
        console.log("No new students to assign.");
    }

    console.log("Revalidating path:", `/dashboard/assign/${lessonId}`);
    revalidatePath(`/dashboard/assign/${lessonId}`);

    console.log("--- ASSIGNMENT API END: Success ---");
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error("--- ASSIGNMENT API END: CRITICAL ERROR ---");
    console.error("ASSIGNMENT_UPDATE_ERROR", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new NextResponse(JSON.stringify({ error: "Failed to update assignments.", details: errorMessage }), { status: 500 });
  }
}