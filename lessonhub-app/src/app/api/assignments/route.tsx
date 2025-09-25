// file: src/app/api/assignments/route.tsx
import { auth } from "@/auth";
import { Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import { sendEmail, createButton } from "@/lib/email-templates";

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== Role.TEACHER) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      lessonId,
      studentIdsToAssign,
      studentIdsToUpdate,
      studentIdsToUnassign,
      notificationOption, // 'immediate', 'on_start_date', or 'none'
    } = body;

    if (!lessonId) {
      return new Response(JSON.stringify({ error: "Lesson ID is required" }), { status: 400 });
    }

    // Unassign students
    if (studentIdsToUnassign && studentIdsToUnassign.length > 0) {
      await prisma.assignment.deleteMany({
        where: { lessonId, studentId: { in: studentIdsToUnassign } },
      });
    }

    const notifyOnStartDate = notificationOption === 'on_start_date';

    // Assign new students
    if (studentIdsToAssign && studentIdsToAssign.length > 0) {
      const assignmentsData = studentIdsToAssign.map((item: { studentId: string; deadline: string; startDate: string; }) => ({
        lessonId,
        studentId: item.studentId,
        deadline: new Date(item.deadline),
        startDate: new Date(item.startDate),
        notifyOnStartDate,
      }));
      await prisma.assignment.createMany({ data: assignmentsData });

      if (notificationOption === 'immediate') {
         const newlyAssignedStudents = await prisma.user.findMany({
          where: { id: { in: studentIdsToAssign.map((item: { studentId: string }) => item.studentId) } },
          select: { email: true, name: true },
        });

        const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, include: { teacher: true }});
        if (lesson) {
            for (const student of newlyAssignedStudents) {
                if (student.email) {
                    const assignmentUrl = `${process.env.AUTH_URL}/my-lessons`;
                    await sendEmail({
                        to: student.email,
                        templateName: 'new_assignment',
                        data: {
                            studentName: student.name || 'student',
                            teacherName: lesson.teacher?.name || 'Your Teacher',
                            lessonTitle: lesson.title,
                            button: createButton('Start Lesson', assignmentUrl)
                        }
                    });
                }
            }
        }
      }
    }

    // Update existing assignments
    if (studentIdsToUpdate && studentIdsToUpdate.length > 0) {
      for (const item of studentIdsToUpdate) {
        await prisma.assignment.updateMany({
          where: { lessonId, studentId: item.studentId },
          data: {
            deadline: new Date(item.deadline),
            startDate: new Date(item.startDate),
            notifyOnStartDate,
          },
        });
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error("Failed to update assignments:", error);
    return new Response(JSON.stringify({ error: "An internal server error occurred" }), { status: 500 });
  }
}