// file: src/actions/studentActions.ts
'use server';

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { Role, AssignmentStatus } from "@prisma/client"; // Import AssignmentStatus
import { sendEmail, createButton } from "@/lib/email-templates";

/**
 * Sends a feedback message from the current student to all teachers.
 */
export async function sendFeedbackToTeachers(feedbackMessage: string) {
  const session = await auth();
  if (!session?.user?.id || !session.user.name) {
    return { success: false, error: "Unauthorized" };
  }

  if (!feedbackMessage.trim()) {
      return { success: false, error: "Feedback message cannot be empty." };
  }

  try {
    const teachers = await prisma.user.findMany({
      where: { role: Role.TEACHER },
    });

    if (teachers.length === 0) {
        return { success: false, error: "No teachers found to send feedback to." };
    }

    for (const teacher of teachers) {
        if (teacher.email) {
            await sendEmail({
                to: teacher.email,
                templateName: 'student_feedback',
                data: {
                    teacherName: teacher.name || 'Teacher',
                    studentName: session.user.name,
                    feedbackMessage,
                }
            });
        }
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to send feedback:", error);
    return { success: false, error: "An error occurred while sending feedback." };
  }
}

/**
 * Calculates the average rating for a specific lesson.
 */
export async function getLessonAverageRating(lessonId: string) {
  try {
    const result = await prisma.assignment.aggregate({
      _avg: {
        rating: true,
      },
      where: {
        lessonId: lessonId,
        rating: {
          not: null,
        },
      },
    });
    return result._avg.rating;
  } catch (error) {
    console.error(`Failed to get average rating for lesson ${lessonId}:`, error);
    return null;
  }
}

/**
 * Fetches and calculates data for the student leaderboard.
 */
export async function getLeaderboardData() {
  try {
    const students = await prisma.user.findMany({
      where: { role: Role.STUDENT },
      include: {
        assignments: {
          where: {
            status: { in: [AssignmentStatus.COMPLETED, AssignmentStatus.GRADED] },
            gradedAt: { not: null },
          },
        },
      },
    });

    const leaderboard = students.map(student => {
      const completedCount = student.assignments.length;
      let totalCompletionTime = 0;

      student.assignments.forEach(a => {
        if (a.gradedAt) {
          totalCompletionTime += new Date(a.gradedAt).getTime() - new Date(a.assignedAt).getTime();
        }
      });
      
      const averageCompletionTime = completedCount > 0 ? totalCompletionTime / completedCount : 0;

      return {
        id: student.id,
        name: student.name,
        completedCount,
        averageCompletionTime,
      };
    })
    .filter(s => s.completedCount > 0)
    .sort((a, b) => b.completedCount - a.completedCount || a.averageCompletionTime - b.averageCompletionTime);

    return leaderboard;
  } catch (error) {
    console.error("Failed to fetch leaderboard data:", error);
    return [];
  }
}

/**
 * Checks if a student has reached a 10-lesson milestone and sends a notification.
 */
export async function checkAndSendMilestoneEmail(studentId: string) {
  try {
    const student = await prisma.user.findUnique({ where: { id: studentId } });
    if (!student || !student.email) return;

    const completedCount = await prisma.assignment.count({
      where: {
        studentId: studentId,
        status: { in: [AssignmentStatus.COMPLETED, AssignmentStatus.GRADED] },
      },
    });

    if (completedCount > 0 && completedCount % 10 === 0) {
      const lastAssignment = await prisma.assignment.findFirst({
        where: { studentId: studentId, status: { in: [AssignmentStatus.COMPLETED, AssignmentStatus.GRADED] } },
        orderBy: { gradedAt: 'desc' },
      });

      if (lastAssignment && !lastAssignment.milestoneNotified) {
        await sendEmail({
          to: student.email,
          templateName: 'milestone_celebration',
          data: {
            studentName: student.name || 'Student',
            button: createButton('View Your Progress', `${process.env.AUTH_URL}/my-lessons`),
          }
        });
        
        await prisma.assignment.update({
          where: { id: lastAssignment.id },
          data: { milestoneNotified: true },
        });
      }
    }
  } catch (error) {
    console.error("Failed to check for milestone:", error);
  }
}