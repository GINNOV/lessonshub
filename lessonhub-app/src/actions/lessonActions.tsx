// file: src/actions/lessonActions.ts
'use server';

import prisma from "@/lib/prisma";
import { Role, AssignmentStatus, LessonType } from "@prisma/client";
import { revalidatePath } from 'next/cache';
import { getEmailTemplateByName } from '@/actions/adminActions';
import { checkAndSendMilestoneEmail } from '@/actions/studentActions';
import { replacePlaceholders, createButton, sendEmail } from '@/lib/email-templates';
import { auth } from "@/auth";
import { nanoid } from 'nanoid';

/**
 * Fetches all lessons created by a specific teacher.
 */
export async function getLessonsForTeacher(teacherId: string) {
  if (!teacherId) {
    return [];
  }
  try {
    const lessons = await prisma.lesson.findMany({
      where: {
        teacherId: teacherId,
      },
      include: {
        assignments: {
          select: {
            status: true,
            deadline: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return lessons;
  } catch (error) {
    console.error("Failed to fetch lessons:", error);
    return [];
  }
}

/**
 * Fetches all submissions for a given lesson, ensuring the request is made by the lesson's teacher.
 */
export async function getSubmissionsForLesson(lessonId: string, teacherId: string) {
  if (!lessonId || !teacherId) {
    return [];
  }
  try {
    const assignments = await prisma.assignment.findMany({
      where: {
        lessonId: lessonId,
        lesson: {
          teacherId: teacherId,
        },
      },
      include: {
        student: true,
      },
      orderBy: {
        assignedAt: 'asc',
      },
    });
    return assignments;
  } catch (error) {
    console.error("Failed to fetch submissions:", error);
    return [];
  }
}

/**
 * Fetches a single lesson by its unique ID, including all related data for editing.
 */
export async function getLessonById(lessonId: string) {
  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        flashcards: true,
        multiChoiceQuestions: {
          include: {
            options: true,
          },
        },
      },
    });
    return lesson;
  } catch (error) {
    console.error("Failed to fetch lesson:", error);
    return null;
  }
}

/**
 * Fetches all users with the 'STUDENT' role.
 */
export async function getAllStudents() {
  try {
    const students = await prisma.user.findMany({
      where: { role: Role.STUDENT },
      orderBy: { email: 'asc' },
    });
    return students;
  } catch (error) {
    console.error("Failed to fetch students:", error);
    return [];
  }
}

/**
 * Fetches all assignments for a specific student's dashboard.
 */
export async function getAssignmentsForStudent(studentId: string) {
  if (!studentId) {
    return [];
  }
  try {
    const assignments = await prisma.assignment.findMany({
      where: {
        studentId: studentId,
        lesson: {
          teacherId: {
            not: null,
          },
        },
      },
      include: {
        lesson: {
          include: {
            teacher: true,
            flashcards: true,
            multiChoiceQuestions: {
              include: {
                options: true,
              },
            },
          },
        },
      },
      orderBy: {
        deadline: 'asc',
      },
    });
    return assignments;
  } catch (error) {
    console.error("Failed to fetch assignments:", error);
    return [];
  }
}

/**
 * Fetches a specific assignment submission for a teacher to grade.
 */
export async function getSubmissionForGrading(
  assignmentId: string,
  teacherId: string
) {
  if (!assignmentId || !teacherId) {
    return null;
  }
  try {
    const assignment = await prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        lesson: {
          teacherId: teacherId,
        },
      },
      include: {
        lesson: {
          include: {
            flashcards: true,
            multiChoiceQuestions: {
              include: {
                options: true,
              },
            },
          },
        },
        student: true,
      },
    });
    return assignment;
  } catch (error) {
    console.error("Failed to fetch submission for grading:", error);
    return null;
  }
}

/**
 * Fetches a specific assignment for a student to view/complete.
 */
export async function getAssignmentById(
  assignmentId: string,
  studentId: string
) {
  if (!assignmentId || !studentId) {
    return null;
  }
  try {
    const assignment = await prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        studentId: studentId,
      },
      include: {
        lesson: {
          include: {
            teacher: true,
            flashcards: true,
            multiChoiceQuestions: {
              include: {
                options: true,
              },
            },
          },
        },
      },
    });
    return assignment;
  } catch (error) {
    console.error("Failed to fetch assignment:", error);
    return null;
  }
}

/**
 * Fetches student users and enriches them with stats.
 */
export async function getStudentsWithStats() {
  try {
    const students = await prisma.user.findMany({
      where: { role: Role.STUDENT },
      include: {
        assignments: {
          where: { status: AssignmentStatus.GRADED },
          select: {
            score: true,
          },
        },
      },
      orderBy: { email: 'asc' },
    });
    return students.map(student => ({
      ...student,
      totalPoints: student.assignments.reduce((sum, a) => sum + (a.score || 0), 0),
    }));
  } catch (error) {
    console.error("Failed to fetch students with stats:", error);
    return [];
  }
}

/**
 * Deletes a lesson owned by the current teacher.
 */
export async function deleteLesson(lessonId: string) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== Role.TEACHER) {
    return { success: false, error: "Unauthorized" };
  }
  try {
    const lesson = await prisma.lesson.findFirst({
      where: { id: lessonId, teacherId: session.user.id },
    });
    if (!lesson) {
      return { success: false, error: "Lesson not found or you don't have permission to delete it." };
    }
    await prisma.lesson.delete({ where: { id: lessonId } });
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error("Failed to delete lesson:", error);
    return { success: false, error: "An error occurred while deleting the lesson." };
  }
}

/**
 * Sends a manual reminder email for a pending assignment.
 */
export async function sendManualReminder(assignmentId: string) {
  try {
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        student: true,
        lesson: {
          include: {
            teacher: true,
          },
        },
      },
    });
    if (!assignment || !assignment.student.email || !assignment.lesson.teacher) {
      throw new Error("Assignment, student email, or teacher not found.");
    }
    if (assignment.status !== AssignmentStatus.PENDING) {
      return { success: false, error: 'This assignment is not pending.' };
    }
    const template = await getEmailTemplateByName('manual_reminder');
    if (!template) {
        return { success: false, error: 'Manual reminder email template not found.' };
    }
    const assignmentUrl = `${process.env.AUTH_URL}/assignments/${assignment.id}`;
    await sendEmail({
        to: assignment.student.email,
        templateName: 'manual_reminder',
        data: {
            studentName: assignment.student.name || 'student',
            teacherName: assignment.lesson.teacher.name || 'your teacher',
            lessonTitle: assignment.lesson.title,
            button: createButton('View Assignment', assignmentUrl, template.buttonColor || undefined),
        }
    });

    // Update the database to record that a reminder was sent
    await prisma.assignment.update({
      where: { id: assignmentId },
      data: { reminderSentAt: new Date() },
    });
    
    revalidatePath(`/dashboard/submissions/${assignment.lessonId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to send reminder:", error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Fails an assignment and notifies the student.
 */
export async function failAssignment(assignmentId: string) {
  try {
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        student: true,
        lesson: true,
      },
    });
    if (!assignment) {
      throw new Error("Assignment not found.");
    }
    await prisma.assignment.update({
      where: { id: assignmentId },
      data: { status: AssignmentStatus.FAILED },
    });
    const template = await getEmailTemplateByName('failed');
    if (template && assignment.student.email) {
      const assignmentUrl = `${process.env.AUTH_URL}/assignments/${assignment.id}`;
      await sendEmail({
          to: assignment.student.email,
          templateName: 'failed',
          data: {
              studentName: assignment.student.name || 'student',
              lessonTitle: assignment.lesson.title,
              button: createButton('View Assignment', assignmentUrl, template.buttonColor || undefined),
          }
      });
    }
    revalidatePath(`/dashboard/submissions/${assignment.lessonId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to fail assignment:", error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Sends a custom email to all students assigned to a specific lesson.
 */
export async function sendCustomEmailToAssignedStudents(lessonId: string, subject: string, body: string) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== Role.TEACHER) {
    return { success: false, error: "Unauthorized" };
  }
  try {
    const assignments = await prisma.assignment.findMany({
      where: { lessonId },
      include: { student: true },
    });
    if (assignments.length === 0) {
        return { success: false, error: "No students are assigned to this lesson." };
    }
    const recipients = assignments.map(a => a.student.email).filter(Boolean) as string[];
    for (const email of recipients) {
        await sendEmail({
            to: email,
            templateName: 'custom',
            data: {},
            override: { subject, body }
        });
    }
    return { success: true };
  } catch (error) {
    console.error("Failed to send custom email:", error);
    return { success: false, error: "An error occurred while sending the email." };
  }
}

/**
 * Marks a flashcard assignment as complete.
 */
export async function completeFlashcardAssignment(assignmentId: string, studentId: string) {
  try {
    const assignment = await prisma.assignment.findFirst({
      where: { id: assignmentId, studentId },
      include: {
        lesson: { include: { teacher: true } },
        student: true,
      },
    });
    if (!assignment) {
      return { success: false, error: "Assignment not found or unauthorized." };
    }
    if (assignment.status !== AssignmentStatus.PENDING) {
      return { success: false, error: "Assignment has already been completed." };
    }
    await prisma.assignment.update({
      where: { id: assignmentId },
      data: { status: AssignmentStatus.COMPLETED },
    });
    const { student, lesson } = assignment;
    const teacher = lesson.teacher;
    if (teacher && teacher.email) {
      const submissionUrl = `${process.env.AUTH_URL}/dashboard/submissions/${lesson.id}`;
      await sendEmail({
        to: teacher.email,
        templateName: 'submission_notification',
        data: {
          teacherName: teacher.name || 'teacher',
          studentName: student.name || 'A student',
          lessonTitle: lesson.title,
          button: createButton('View Submissions', submissionUrl),
        }
      });
    }
    revalidatePath('/my-lessons');
    return { success: true };
  } catch (error) {
    console.error("Failed to complete assignment:", error);
    return { success: false, error: "An internal error occurred." };
  }
}

/**
 * Submits and auto-grades a multi-choice assignment.
 */
export async function submitMultiChoiceAssignment(assignmentId: string, studentId: string, answers: Record<string, string>) {
  try {
    const assignment = await prisma.assignment.findFirst({
      where: { id: assignmentId, studentId },
      include: {
        lesson: {
          include: {
            teacher: true,
            multiChoiceQuestions: {
              include: { options: true },
            },
          },
        },
        student: true,
      },
    });
    if (!assignment) {
      return { success: false, error: "Assignment not found or unauthorized." };
    }
    if (assignment.status !== AssignmentStatus.PENDING) {
      return { success: false, error: "Assignment has already been submitted." };
    }
    const questions = assignment.lesson.multiChoiceQuestions;
    let score = 0;
    const results = questions.map(q => {
      const selectedAnswerId = answers[q.id];
      const correctAnswer = q.options.find(opt => opt.isCorrect);
      const isCorrect = selectedAnswerId === correctAnswer?.id;
      if (isCorrect) {
        score++;
      }
      return {
        questionId: q.id,
        selectedAnswerId,
        isCorrect,
      };
    });
    await prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        status: AssignmentStatus.GRADED,
        score,
        answers: results as any,
        gradedAt: new Date(),
      },
    });
    const { student, lesson } = assignment;
    const teacher = lesson.teacher;
    if (teacher && teacher.email) {
      const submissionUrl = `${process.env.AUTH_URL}/dashboard/grade/${assignment.id}`;
      await sendEmail({
        to: teacher.email,
        templateName: 'submission_notification',
        data: {
          teacherName: teacher.name || 'teacher',
          studentName: student.name || 'A student',
          lessonTitle: lesson.title,
          button: createButton('View & Grade Submission', submissionUrl),
        },
      });
    }
    revalidatePath('/my-lessons');
    return { success: true, data: { score, results } };
  } catch (error) {
    console.error("Failed to submit multi-choice assignment:", error);
    return { success: false, error: "An internal error occurred." };
  }
}

/**
 * Grades an assignment, notifies the student, and revalidates relevant pages.
 */
export async function gradeAssignment(assignmentId: string, data: { score: number; teacherComments: string }) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== Role.TEACHER) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const assignment = await prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        lesson: {
          teacherId: session.user.id,
        },
      },
      include: {
        student: true,
        lesson: true,
      }
    });

    if (!assignment) {
      return { success: false, error: "Assignment not found or you don't have permission to grade it." };
    }

    await prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        score: data.score,
        teacherComments: data.teacherComments,
        status: AssignmentStatus.GRADED,
        gradedAt: new Date(),
      },
    });

    const template = await getEmailTemplateByName('graded');
    if (template && assignment.student?.email) {
      try {
        const assignmentUrl = `${process.env.AUTH_URL}/assignments/${assignment.id}`;
        await sendEmail({
          to: assignment.student.email,
          templateName: 'graded',
          data: {
            studentName: assignment.student.name || 'student',
            lessonTitle: assignment.lesson.title,
            score: data.score.toString(),
            teacherComments: data.teacherComments ? `<p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;"><strong>Teacher's Feedback:</strong><br/><em>&quot;${data.teacherComments}&quot;</em></p>` : '',
            button: createButton('View Your Grade', assignmentUrl),
          }
        });

        
      } catch (emailError) {
        console.error("An unexpected error occurred while sending the email:", emailError);
      }
    }

    // After successfully grading, check for a milestone
    await checkAndSendMilestoneEmail(assignment.studentId);
    
    revalidatePath(`/dashboard/submissions/${assignment.lessonId}`);
    revalidatePath('/my-lessons'); // This line ensures the student's dashboard is updated.
    return { success: true };

  } catch (error) {
    console.error("GRADE_SUBMISSION_ERROR", error);
    return { success: false, error: "Failed to submit grade." };
  }
}


/**
 * Submits a standard (text-based) assignment.
 */
export async function submitStandardAssignment(
  assignmentId: string,
  studentId: string,
  data: { answers: string[]; studentNotes: string; rating?: number } // Add rating to the data object
) {
  try {
    const assignment = await prisma.assignment.findFirst({
      where: { id: assignmentId, studentId },
      include: {
        lesson: { include: { teacher: true } },
        student: true,
      },
    });
    if (!assignment) {
      return { success: false, error: "Assignment not found or unauthorized." };
    }
    if (assignment.status !== AssignmentStatus.PENDING) {
      return { success: false, error: "Assignment has already been submitted." };
    }
    if (new Date() > new Date(assignment.deadline)) {
      return { success: false, error: "The deadline for this assignment has passed." };
    }
    const updatedAssignment = await prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        answers: data.answers,
        studentNotes: data.studentNotes,
        rating: data.rating, // Save the rating
        status: AssignmentStatus.COMPLETED,
      },
    });
    const { student, lesson } = assignment;
    const teacher = lesson.teacher;
    if (teacher && teacher.email) {
      const submissionUrl = `${process.env.AUTH_URL}/dashboard/grade/${assignment.id}`;
      await sendEmail({
        to: teacher.email,
        templateName: 'submission_notification',
        data: {
          teacherName: teacher.name || 'teacher',
          studentName: student.name || 'A student',
          lessonTitle: lesson.title,
          button: createButton('View & Grade Submission', submissionUrl),
        },
      });
    }
    revalidatePath('/my-lessons');
    return { success: true, data: updatedAssignment };
  } catch (error) {
    console.error("Failed to submit standard assignment:", error);
    return { success: false, error: "An internal error occurred." };
  }
}

/**
 * Calculates the total value of a student's completed lessons.
 */
export async function getStudentStats(studentId: string) {
  if (!studentId) {
    return { totalValue: 0 };
  }
  try {
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { isPaying: true },
    });

    if (!student?.isPaying) {
      return { totalValue: 0 };
    }

    const assignments = await prisma.assignment.findMany({
      where: {
        studentId: studentId,
        OR: [{ status: AssignmentStatus.GRADED }, { status: AssignmentStatus.FAILED }],
      },
      include: {
        lesson: {
          select: { price: true },
        },
      },
    });
    let totalValue = 0;
    assignments.forEach(a => {
      const price = a.lesson.price.toNumber();
      if (a.status === AssignmentStatus.FAILED) {
        totalValue -= price;
      } else if (a.status === AssignmentStatus.GRADED && a.score !== null && a.score >= 0) {
        totalValue += price;
      }
    });
    return { totalValue };
  } catch (error) {
    console.error("Failed to calculate student stats:", error);
    return { totalValue: 0 };
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
 * Gets the number of students who have completed a specific lesson.
 */
export async function getLessonCompletionStats(lessonId: string) {
  try {
    const count = await prisma.assignment.count({
      where: {
        lessonId: lessonId,
        status: {
          in: [AssignmentStatus.COMPLETED, AssignmentStatus.GRADED],
        },
      },
    });
    return count;
  } catch (error) {
    console.error("Failed to fetch lesson completion stats:", error);
    return 0;
  }
}

/**
 * Generates or retrieves a unique shareable link for a lesson.
 */
export async function generateShareLink(lessonId: string) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== Role.TEACHER) {
    return { success: false, error: "Unauthorized" };
  }
  try {
    const lesson = await prisma.lesson.findFirst({
      where: { id: lessonId, teacherId: session.user.id },
    });
    if (!lesson) {
      return { success: false, error: "Lesson not found." };
    }
    let shareId = lesson.public_share_id;
    if (!shareId) {
      shareId = nanoid(12);
      await prisma.lesson.update({
        where: { id: lessonId },
        data: { public_share_id: shareId },
      });
    }
    const shareUrl = `${process.env.AUTH_URL}/share/lesson/${shareId}`;
    return { success: true, url: shareUrl };
  } catch (error) {
    console.error("Failed to generate share link:", error);
    return { success: false, error: "An internal error occurred." };
  }
}

/**
 * Finds a lesson by its public share ID and assigns it to the given student.
 */
export async function assignLessonByShareId(shareId: string, studentId: string) {
  try {
    // Switched from the overly-strict `findUnique` to the more flexible `findFirst`.
    // Since `public_share_id` is unique in the database, this is functionally identical and type-safe.
    const lesson = await prisma.lesson.findFirst({
      where: { public_share_id: shareId },
    });

    if (!lesson) {
      return null;
    }

    const existingAssignment = await prisma.assignment.findUnique({
      where: {
        lessonId_studentId: {
          lessonId: lesson.id,
          studentId,
        },
      },
    });

    if (existingAssignment) {
      return existingAssignment;
    }
    
    const newAssignment = await prisma.assignment.create({
      data: {
        lessonId: lesson.id,
        studentId,
        deadline: new Date(Date.now() + 36 * 60 * 60 * 1000),
      },
    });

    revalidatePath('/my-lessons');
    return newAssignment;

  } catch (error) {
    console.error("Failed to assign lesson by share ID:", error);
    return null;
  }
}

/**
 * Fetches all unique assignment image URLs.
 */
export async function getUploadedImages() {
  try {
    const lessonsWithImages = await prisma.lesson.findMany({
      where: {
        assignment_image_url: {
          not: null,
        },
      },
      select: {
        assignment_image_url: true,
      },
      distinct: ['assignment_image_url'],
    });
    return lessonsWithImages.map(lesson => lesson.assignment_image_url).filter(Boolean) as string[];
  } catch (error) {
    console.error("Failed to fetch uploaded images:", error);
    return [];
  }
}