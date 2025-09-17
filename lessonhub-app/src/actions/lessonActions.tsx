// file: src/actions/lessonActions.tsx
'use server';

import prisma from "@/lib/prisma";
import { Role, AssignmentStatus, LessonType } from "@prisma/client";
import { revalidatePath } from 'next/cache';
import { getEmailTemplateByName } from '@/actions/adminActions';
import { replacePlaceholders, createButton, sendEmail } from '@/lib/email-templates';
import { auth } from "@/auth";
import { nanoid } from 'nanoid';
import { checkAndSendMilestoneEmail } from "./studentActions";

/**
 * Fetches all lessons created by a specific teacher.
 */
export async function getLessonsForTeacher(teacherId: string) {
  try {
    const lessons = await prisma.lesson.findMany({
      where: { teacherId: teacherId },
      include: {
        assignments: {
          select: {
            status: true,
            deadline: true,
          }
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return lessons;
  } catch (error) {
    console.error("Failed to fetch lessons for teacher:", error);
    return [];
  }
}

/**
 * Fetches all assignments for a specific student.
 */
export async function getAssignmentsForStudent(studentId: string) {
    try {
        const assignments = await prisma.assignment.findMany({
            where: { studentId: studentId },
            include: {
                lesson: {
                    include: {
                        teacher: true,
                    }
                }
            },
            orderBy: { assignedAt: 'desc' }
        });
        return assignments;
    } catch (error) {
        console.error("Failed to fetch assignments for student:", error);
        return [];
    }
}

/**
 * Fetches a single assignment by its ID for a specific student.
 */
export async function getAssignmentById(assignmentId: string, studentId: string) {
  try {
    const assignment = await prisma.assignment.findFirst({
      where: { id: assignmentId, studentId: studentId },
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
      },
    });
    return assignment;
  } catch (error) {
    console.error("Failed to fetch assignment:", error);
    return null;
  }
}

/**
 * Fetches a single lesson by its ID, including its flashcards or questions.
 */
export async function getLessonById(lessonId: string) {
  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        flashcards: {
            select: {
                id: true,
                term: true,
                definition: true,
                termImageUrl: true,
                definitionImageUrl: true,
                lessonId: true,
            }
        },
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
 * Fetches all student submissions for a specific lesson taught by a teacher.
 */
export async function getSubmissionsForLesson(lessonId: string, teacherId: string) {
  try {
    const submissions = await prisma.assignment.findMany({
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
        assignedAt: 'desc',
      },
    });
    return submissions;
  } catch (error) {
    console.error("Failed to fetch submissions:", error);
    return [];
  }
}

/**
 * Fetches a single submission for grading.
 */
export async function getSubmissionForGrading(assignmentId: string, teacherId: string) {
    try {
        const submission = await prisma.assignment.findFirst({
            where: {
                id: assignmentId,
                lesson: {
                    teacherId: teacherId,
                },
            },
            include: {
                student: true,
                lesson: {
                    include: {
                        multiChoiceQuestions: {
                            include: {
                                options: true,
                            },
                        },
                    },
                },
            },
        });
        return submission;
    } catch (error) {
        console.error("Failed to fetch submission for grading:", error);
        return null;
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
 * Generates or retrieves a unique shareable link for a lesson.
 */
export async function generateShareLink(lessonId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { public_share_id: true }
    });

    if (lesson?.public_share_id) {
      return { success: true, url: `${process.env.AUTH_URL}/share/lesson/${lesson.public_share_id}` };
    }

    const shareId = nanoid(12);
    await prisma.lesson.update({
      where: { id: lessonId },
      data: { public_share_id: shareId }
    });

    return { success: true, url: `${process.env.AUTH_URL}/share/lesson/${shareId}` };
  } catch (error) {
    console.error("Failed to generate share link:", error);
    return { success: false, error: 'Failed to generate share link.' };
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
 * Marks a past-due assignment as failed.
 */
export async function failAssignment(assignmentId: string) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== Role.TEACHER) {
    return { success: false, error: 'Unauthorized' };
  }
  
  try {
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { student: true, lesson: true },
    });
    
    if (!assignment) {
      return { success: false, error: 'Assignment not found' };
    }
    
    if (new Date() < new Date(assignment.deadline)) {
      return { success: false, error: 'Cannot fail an assignment before its deadline.' };
    }

    await prisma.assignment.update({
      where: { id: assignmentId },
      data: { status: AssignmentStatus.FAILED, score: -1 },
    });

    const template = await getEmailTemplateByName('failed');
    if (template && assignment.student?.email) {
      const assignmentUrl = `${process.env.AUTH_URL}/assignments/${assignment.id}`;
      await sendEmail({
        to: assignment.student.email,
        templateName: 'failed',
        data: {
          studentName: assignment.student.name || 'student',
          lessonTitle: assignment.lesson.title,
          button: createButton('View Details', assignmentUrl, template.buttonColor || undefined),
        }
      });
    }

    revalidatePath(`/dashboard/submissions/${assignment.lessonId}`);
    revalidatePath('/my-lessons');
    return { success: true };
  } catch (error) {
    console.error("Failed to mark assignment as failed:", error);
    return { success: false, error: 'An unexpected error occurred.' };
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
    
    await checkAndSendMilestoneEmail(assignment.studentId);

    revalidatePath(`/dashboard/submissions/${assignment.lessonId}`);
    revalidatePath('/my-lessons');
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
  data: { answers: string[]; studentNotes: string; rating?: number }
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
        rating: data.rating,
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

// Functions that were missing
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

/**
 * Fetches all students and calculates their total points from graded assignments.
 */
export async function getStudentsWithStats() {
  const students = await prisma.user.findMany({
    where: { role: Role.STUDENT },
    include: {
      assignments: {
        where: {
          status: AssignmentStatus.GRADED,
          score: { not: null },
        },
      },
    },
    orderBy: { name: 'asc' }
  });

  return students.map(student => {
    const totalPoints = student.assignments.reduce((sum, a) => sum + (a.score || 0), 0);
    // eslint-disable-next-line no-unused-vars
    const { assignments, ...studentData } = student;
    return {
      ...studentData,
      totalPoints,
    };
  });
}

export async function assignLessonByShareId(shareId: string, studentId: string) {
    try {
        const lesson = await prisma.lesson.findFirst({ where: { public_share_id: shareId } });
        if (!lesson) {
            return { success: false, error: 'Shared lesson not found.' };
        }
        
        const existingAssignment = await prisma.assignment.findFirst({
            where: { lessonId: lesson.id, studentId: studentId }
        });

        if (existingAssignment) {
            // If already assigned, return the existing assignment
            return { success: true, assignment: existingAssignment };
        }

        const newAssignment = await prisma.assignment.create({
            data: {
                studentId: studentId,
                lessonId: lesson.id,
                deadline: new Date(Date.now() + 36 * 60 * 60 * 1000), // 36 hours from now
            }
        });

        revalidatePath('/my-lessons');
        return { success: true, assignment: newAssignment };
    } catch (error) {
        return { success: false, error: 'Failed to assign lesson.' };
    }
}

export async function deleteLesson(lessonId: string) {
    try {
        await prisma.lesson.delete({ where: { id: lessonId }});
        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Failed to delete lesson.' };
    }
}

export async function sendCustomEmailToAssignedStudents(lessonId: string, subject: string, body: string) {
    try {
        const assignments = await prisma.assignment.findMany({
            where: { lessonId },
            include: { student: true, lesson: { include: { teacher: true }}}
        });
        if (assignments.length === 0) {
            return { success: false, error: 'No students assigned to this lesson.' };
        }
        for (const assignment of assignments) {
            if (assignment.student.email) {
                await sendEmail({
                    to: assignment.student.email,
                    templateName: 'custom',
                    data: {
                        studentName: assignment.student.name || 'student',
                        teacherName: assignment.lesson.teacher?.name || 'your teacher',
                        lessonTitle: assignment.lesson.title,
                    },
                    override: { subject, body }
                });
            }
        }
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Failed to send emails.' };
    }
}

export async function completeFlashcardAssignment(assignmentId: string, studentId: string) {
    try {
        const assignment = await prisma.assignment.update({
            where: { id: assignmentId, studentId: studentId },
            data: { status: AssignmentStatus.COMPLETED }
        });
        revalidatePath('/my-lessons');
        return { success: true, data: assignment };
    } catch (error) {
        return { success: false, error: 'Failed to complete assignment.' };
    }
}

export async function submitMultiChoiceAssignment(assignmentId: string, studentId: string, answers: { [key: string]: string }) {
    try {
        const assignment = await prisma.assignment.findUnique({
            where: { id: assignmentId, studentId: studentId },
            include: { lesson: { include: { multiChoiceQuestions: { include: { options: true }}}}}
        });
        if (!assignment) return { success: false, error: 'Assignment not found' };

        let correctCount = 0;
        const processedAnswers = assignment.lesson.multiChoiceQuestions.map(q => {
            const selectedOptionId = answers[q.id];
            const correctOption = q.options.find(o => o.isCorrect);
            const isCorrect = selectedOptionId === correctOption?.id;
            if (isCorrect) correctCount++;
            return { questionId: q.id, selectedAnswerId: selectedOptionId, isCorrect };
        });

        const score = Math.round((correctCount / assignment.lesson.multiChoiceQuestions.length) * 10);

        const updatedAssignment = await prisma.assignment.update({
            where: { id: assignmentId },
            data: {
                answers: processedAnswers,
                status: AssignmentStatus.GRADED,
                score: score,
                gradedAt: new Date()
            }
        });
        revalidatePath('/my-lessons');
        return { success: true, data: updatedAssignment };
    } catch (error) {
        return { success: false, error: 'Failed to submit assignment.' };
    }
}