// file: src/app/api/assignments/route.tsx
import { auth } from "@/auth";
import { Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import { createButton } from "@/lib/email-templates";
import { sendEmail } from "@/lib/email-templates.server";
import { AssignmentScheduleEntry, getImmediateStartStudentIds } from "@/lib/assignmentNotifications";

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

    type AssignmentRequestPayload = {
      studentId: string;
      deadline: string;
      startDate: string;
    };

    type AssignmentWithRelations = {
      id: string;
      deadline: Date;
      startDate: Date;
      student: {
        email: string | null;
        name: string | null;
        timeZone: string | null;
      } | null;
      lesson: {
        title: string;
        teacher: {
          name: string | null;
        } | null;
      } | null;
    };

    const formatDeadline = (deadline: Date, timeZone?: string | null) => {
      try {
        return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: timeZone || undefined }).format(deadline);
      } catch {
        return deadline.toLocaleString();
      }
    };

    const sendStartAvailabilityEmail = async (assignment: AssignmentWithRelations) => {
      const student = assignment.student;
      const lesson = assignment.lesson;
      if (!student?.email || !lesson?.teacher) {
        return false;
      }
      const assignmentUrl = `${process.env.AUTH_URL}/my-lessons`;
      const deadlineStr = formatDeadline(new Date(assignment.deadline), student.timeZone);
      await sendEmail({
        to: student.email,
        templateName: 'new_assignment',
        data: {
          studentName: student.name || 'student',
          teacherName: lesson.teacher.name || 'Your Teacher',
          lessonTitle: lesson.title,
          deadline: deadlineStr,
          button: createButton('Start Lesson', assignmentUrl),
        },
      });
      return true;
    };

    if (!lessonId) {
      return new Response(JSON.stringify({ error: "Lesson ID is required" }), { status: 400 });
    }

    const assignmentsToAssign = Array.isArray(studentIdsToAssign)
      ? (studentIdsToAssign as AssignmentRequestPayload[])
      : [];
    const assignmentsToUpdate = Array.isArray(studentIdsToUpdate)
      ? (studentIdsToUpdate as AssignmentRequestPayload[])
      : [];
    const studentIdsToUnassignArray = Array.isArray(studentIdsToUnassign)
      ? (studentIdsToUnassign as string[])
      : [];

    // Unassign students
    if (studentIdsToUnassignArray.length > 0) {
      await prisma.assignment.deleteMany({
        where: { lessonId, studentId: { in: studentIdsToUnassignArray } },
      });
    }

    const shouldScheduleStartNotificationsForNewAssignments = notificationOption === 'on_start_date';
    const disableStartNotifications = notificationOption === 'none';

    // Assign new students
    if (assignmentsToAssign.length > 0) {
      const assignmentsData = assignmentsToAssign.map((item) => {
        const parsedDeadline = new Date(item.deadline);
        return {
          lessonId,
          studentId: item.studentId,
          deadline: parsedDeadline,
          originalDeadline: parsedDeadline,
          startDate: new Date(item.startDate),
          notifyOnStartDate: shouldScheduleStartNotificationsForNewAssignments,
        };
      });
      await prisma.assignment.createMany({ data: assignmentsData });

      if (notificationOption === 'immediate') {
         const newlyAssignedStudents = await prisma.user.findMany({
          where: { id: { in: assignmentsToAssign.map((item) => item.studentId) } },
          select: { id: true, email: true, name: true, timeZone: true },
        });

        const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, include: { teacher: true }});
        if (lesson) {
            for (const student of newlyAssignedStudents) {
                if (student.email) {
                    const assignmentUrl = `${process.env.AUTH_URL}/my-lessons`;
                    // Find this student's deadline from payload to personalize the email
                    const assigned = assignmentsToAssign.find((i) => i.studentId === student.id);
                    const deadlineStr = assigned ? formatDeadline(new Date(assigned.deadline), student.timeZone) : '';
                    await sendEmail({
                        to: student.email,
                        templateName: 'new_assignment',
                        data: {
                            studentName: student.name || 'student',
                            teacherName: lesson.teacher?.name || 'Your Teacher',
                            lessonTitle: lesson.title,
                            deadline: deadlineStr,
                            button: createButton('Start Lesson', assignmentUrl)
                        }
                    });
                }
            }
        }
      }

      if (shouldScheduleStartNotificationsForNewAssignments) {
        const now = new Date();
        const scheduleEntries: AssignmentScheduleEntry[] = assignmentsData.map(({ studentId, startDate }) => ({
          studentId,
          startDate,
        }));
        const studentIdsNeedingImmediateNotification = getImmediateStartStudentIds(scheduleEntries, now);

        if (studentIdsNeedingImmediateNotification.length > 0) {
          const assignmentsNeedingEmail = await prisma.assignment.findMany({
            where: {
              lessonId,
              studentId: { in: studentIdsNeedingImmediateNotification },
            },
            include: {
              student: true,
              lesson: { include: { teacher: true } },
            },
          });

          const idsToDisable: string[] = [];
          for (const assignment of assignmentsNeedingEmail as AssignmentWithRelations[]) {
            const didSend = await sendStartAvailabilityEmail(assignment);
            if (didSend) {
              idsToDisable.push(assignment.id);
            }
          }

          if (idsToDisable.length > 0) {
            await prisma.assignment.updateMany({
              where: { id: { in: idsToDisable } },
              data: { notifyOnStartDate: false },
            });
          }
        }
      }
    }

    // Update existing assignments
    if (assignmentsToUpdate.length > 0) {
      const existingAssignmentStates = await prisma.assignment.findMany({
        where: {
          lessonId,
          studentId: { in: assignmentsToUpdate.map((item) => item.studentId) },
        },
        select: {
          studentId: true,
          notifyOnStartDate: true,
          deadline: true,
          originalDeadline: true,
        },
      });
      const stateByStudent = new Map(existingAssignmentStates.map((state) => [state.studentId, state]));

      for (const item of assignmentsToUpdate) {
        const existingState = stateByStudent.get(item.studentId);
        const previousNotifyState = existingState?.notifyOnStartDate;
        const shouldNotifyOnStartDate =
          shouldScheduleStartNotificationsForNewAssignments
            ? true
            : disableStartNotifications
              ? false
              : previousNotifyState ?? false;
        const parsedDeadline = new Date(item.deadline);
        const parsedStartDate = new Date(item.startDate);
        let originalDeadlineForUpdate: Date | undefined;
        if (existingState?.originalDeadline) {
          originalDeadlineForUpdate = existingState.originalDeadline;
        } else if (existingState && parsedDeadline.getTime() !== existingState.deadline.getTime()) {
          originalDeadlineForUpdate = existingState.deadline;
        }

        const updateData: Record<string, any> = {
          deadline: parsedDeadline,
          startDate: parsedStartDate,
          notifyOnStartDate: shouldNotifyOnStartDate,
        };

        if (originalDeadlineForUpdate) {
          updateData.originalDeadline = originalDeadlineForUpdate;
        }

        const updatedAssignment = await prisma.assignment.update({
          where: { lessonId_studentId: { lessonId, studentId: item.studentId } },
          data: updateData,
          include: {
            student: true,
            lesson: { include: { teacher: true } },
          },
        });

        if (updatedAssignment.notifyOnStartDate && updatedAssignment.startDate && updatedAssignment.startDate <= new Date()) {
          const didSend = await sendStartAvailabilityEmail(updatedAssignment as AssignmentWithRelations);
          if (didSend) {
            await prisma.assignment.update({
              where: { id: updatedAssignment.id },
              data: { notifyOnStartDate: false },
            });
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error("Failed to update assignments:", error);
    return new Response(JSON.stringify({ error: "An internal server error occurred" }), { status: 500 });
  }
}
