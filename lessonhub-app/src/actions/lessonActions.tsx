// file: src/actions/lessonActions.tsx
'use server';

import prisma from "@/lib/prisma";
import { Role, AssignmentStatus, LessonType, Prisma } from "@prisma/client";
import { revalidatePath } from 'next/cache';
import { getEmailTemplateByName } from '@/actions/adminActions';
import { createButton, sendEmail } from '@/lib/email-templates';
import { auth } from "@/auth";
import { nanoid } from 'nanoid';
import { checkAndSendMilestoneEmail } from "./studentActions";

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

export async function getStudentsWithStats(teacherId?: string) {
  const whereClause: any = {
    role: Role.STUDENT,
    isTakingBreak: false, // Exclude students who are on a break
  };
  if (teacherId) {
    whereClause.teachers = {
      some: {
        teacherId: teacherId
      }
    };
  }
  const students = await prisma.user.findMany({
    where: whereClause,
    include: {
      assignments: {
        where: {
          status: AssignmentStatus.GRADED,
          score: { not: null },
        },
      },
      teachers: {
        select: { teacherId: true, classId: true },
      },
    },
    orderBy: { name: 'asc' }
  });

  return students.map((student: any) => {
    const totalPoints = student.assignments.reduce((sum: number, a: any) => sum + (a.score || 0), 0);
    const { assignments, ...studentData } = student;
    const linkArr: Array<{ teacherId: string; classId: string | null }> = student.teachers || [];
    const currentClassId = teacherId
      ? (linkArr.find(l => l.teacherId === teacherId)?.classId ?? null)
      : null;
    const serializableStudent = {
      ...studentData,
      defaultLessonPrice: studentData.defaultLessonPrice?.toNumber?.() ?? null,
      currentClassId,
      totalPoints,
    };
    return serializableStudent;
  });
}

export async function deleteLesson(lessonId: string) {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== Role.TEACHER) {
        return { success: false, error: "Unauthorized" };
    }
    try {
        await prisma.lesson.delete({ where: { id: lessonId, teacherId: session.user.id }});
        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Failed to delete lesson.' };
    }
}

export async function duplicateLesson(lessonId: string) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== Role.TEACHER) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const lesson = await prisma.lesson.findFirst({
      where: { id: lessonId, teacherId: session.user.id },
      include: {
        flashcards: true,
        multiChoiceQuestions: {
          include: { options: true },
        },
      },
    });

    if (!lesson) {
      return { success: false, error: 'Lesson not found.' };
    }

    const prefixedTitle = lesson.title.trim().toLowerCase().startsWith('copy ')
      ? lesson.title.trim()
      : `copy ${lesson.title.trim()}`;

    const duplicatedLesson = await prisma.lesson.create({
      data: {
        title: prefixedTitle,
        type: lesson.type,
        lesson_preview: lesson.lesson_preview,
        assignment_text: lesson.assignment_text,
        questions: lesson.questions === null ? undefined : (lesson.questions as Prisma.InputJsonValue),
        assignment_image_url: lesson.assignment_image_url,
        soundcloud_url: lesson.soundcloud_url,
        context_text: lesson.context_text,
        attachment_url: lesson.attachment_url,
        notes: lesson.notes,
        assignment_notification: lesson.assignment_notification,
        scheduled_assignment_date: lesson.scheduled_assignment_date,
        teacherId: session.user.id,
        price: lesson.price,
        public_share_id: null,
        flashcards: lesson.flashcards.length
          ? {
              create: lesson.flashcards.map((card) => ({
                term: card.term,
                definition: card.definition,
                termImageUrl: card.termImageUrl,
                definitionImageUrl: card.definitionImageUrl,
              })),
            }
          : undefined,
        multiChoiceQuestions: lesson.multiChoiceQuestions.length
          ? {
              create: lesson.multiChoiceQuestions.map((question) => ({
                question: question.question,
                options: question.options.length
                  ? {
                      create: question.options.map((option) => ({
                        text: option.text,
                        isCorrect: option.isCorrect,
                      })),
                    }
                  : undefined,
              })),
            }
          : undefined,
      },
    });

    revalidatePath('/dashboard');
    return { success: true, lessonId: duplicatedLesson.id };
  } catch (error) {
    console.error('Failed to duplicate lesson:', error);
    return { success: false, error: 'Failed to duplicate lesson.' };
  }
}

export async function sendCustomEmailToAssignedStudents(lessonId: string, subject: string, body: string) {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== Role.TEACHER) {
        return { success: false, error: "Unauthorized" };
    }
    try {
        const assignments = await prisma.assignment.findMany({
            where: { lessonId, lesson: { teacherId: session.user.id } },
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
            return { success: true, assignment: existingAssignment };
        }

        const newAssignment = await prisma.assignment.create({
            data: {
                studentId: studentId,
                lessonId: lesson.id,
                deadline: new Date(Date.now() + 36 * 60 * 60 * 1000),
            }
        });

        revalidatePath('/my-lessons');
        return { success: true, assignment: newAssignment };
    } catch (error) {
        return { success: false, error: 'Failed to assign lesson.' };
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

export async function submitFlashcardAssignment(
  assignmentId: string,
  answers: Record<string, 'correct' | 'incorrect'>,
  rating?: number
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const assignment = await prisma.assignment.findFirst({
      where: { id: assignmentId, studentId: session.user.id },
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

    const correctCount = Object.values(answers).filter(a => a === 'correct').length;
    const totalCount = Object.keys(answers).length;
    const score = totalCount > 0 ? Math.round((correctCount / totalCount) * 10) : 0;

    await prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        answers: answers,
        status: AssignmentStatus.COMPLETED,
        score: score,
        rating: rating,
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
          button: createButton('View Submission', submissionUrl),
        },
      });
    }

    revalidatePath('/my-lessons');
    await checkAndSendMilestoneEmail(session.user.id);
    return { success: true };
  } catch (error) {
    console.error("Failed to submit flashcard assignment:", error);
    return { success: false, error: "An internal error occurred." };
  }
}

export async function submitMultiChoiceAssignment(assignmentId: string, studentId: string, answers: { [key: string]: string }, rating?: number) {
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
                gradedAt: new Date(),
                rating: rating,
            }
        });
        revalidatePath('/my-lessons');
        await checkAndSendMilestoneEmail(studentId);
        revalidatePath('/my-lessons');
    await checkAndSendMilestoneEmail(studentId);
    return { success: true, data: updatedAssignment };
    } catch (error) {
        console.error("Failed to submit multi-choice assignment:", error);
        return { success: false, error: 'Failed to submit assignment.' };
    }
}

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

export async function getAssignmentsForStudent(studentId: string) {
    try {
        const student = await prisma.user.findUnique({
            where: { id: studentId },
            select: { isSuspended: true, isTakingBreak: true } // Select the new field
        });

        // If suspended or taking a break, return no assignments
        if (!student || student.isSuspended || student.isTakingBreak) {
            return [];
        }

        // Select explicit scalar fields to avoid querying optional columns
        // that may not exist yet in some environments (e.g., teacherAnswerComments).
        const assignments = await prisma.assignment.findMany({
            where: {
                studentId: studentId,
                startDate: {
                    lte: new Date(),
                },
            },
            select: {
                id: true,
                assignedAt: true,
                startDate: true,
                deadline: true,
                status: true,
                score: true,
                gradedAt: true,
                studentNotes: true,
                rating: true,
                answers: true,
                teacherComments: true,
                // teacherAnswerComments intentionally omitted for DBs without the column
                reminderSentAt: true,
                milestoneNotified: true,
                notifyOnStartDate: true,
                lessonId: true,
                studentId: true,
                lesson: {
                    select: {
                        id: true,
                        teacherId: true,
                        title: true,
                        type: true,
                        lesson_preview: true,
                        assignment_text: true,
                        questions: true,
                        assignment_image_url: true,
                        soundcloud_url: true,
                        context_text: true,
                        attachment_url: true,
                        notes: true,
                        assignment_notification: true,
                        scheduled_assignment_date: true,
                        createdAt: true,
                        updatedAt: true,
                        public_share_id: true,
                        price: true,
                        teacher: {
                            select: {
                                id: true,
                                name: true,
                                image: true,
                                // Keep optional; if absent in DB, Prisma will ignore
                                defaultLessonPrice: true,
                            }
                        },
                        _count: { select: { assignments: true } },
                    },
                },
            },
            orderBy: { deadline: 'asc' },
        });
        return assignments;
    } catch (error) {
        console.error("Failed to fetch assignments for student:", error);
        return [];
    }
}

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
        deadline: 'asc',
      },
    });
    return submissions;
  } catch (error) {
    console.error("Failed to fetch submissions:", error);
    return [];
  }
}

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
        return submission;
    } catch (error) {
        console.error("Failed to fetch submission for grading:", error);
        return null;
    }
}

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
      select: {
        id: true,
        status: true,
        score: true,
        lesson: { select: { price: true } },
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

export async function extendDeadline(assignmentId: string) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== Role.TEACHER) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      return { success: false, error: "Assignment not found." };
    }

    const newDeadline = new Date();
    newDeadline.setHours(newDeadline.getHours() + 48);

    await prisma.assignment.update({
      where: { id: assignmentId },
      data: { deadline: newDeadline, status: AssignmentStatus.PENDING },
    });

    revalidatePath(`/dashboard/submissions/${assignment.lessonId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to extend deadline:", error);
    return { success: false, error: "An error occurred." };
  }
}

export async function gradeAssignment(
  assignmentId: string,
  data: { score: number; teacherComments: string; answerComments?: Record<number, string> }
) {
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

    try {
      await prisma.assignment.update({
        where: { id: assignmentId },
        data: {
          score: data.score,
          teacherComments: data.teacherComments,
          // Store only when at least one per-answer comment is present
          teacherAnswerComments:
            data.answerComments && Object.keys(data.answerComments).length > 0
              ? (data.answerComments as unknown as object)
              : undefined,
          status: AssignmentStatus.GRADED,
          gradedAt: new Date(),
        },
      });
    } catch (err) {
      // Fallback if the JSON column isn't available yet: append per-answer comments to teacherComments
      const hasPerAnswer = data.answerComments && Object.keys(data.answerComments).length > 0;
      const appended = hasPerAnswer
        ? `${data.teacherComments || ''}\n\nPer-answer comments:\n${Object.entries(data.answerComments as Record<number, string>)
            .map(([i, c]) => `- Q${Number(i) + 1}: ${c}`)
            .join('\n')}`
        : data.teacherComments;

      await prisma.assignment.update({
        where: { id: assignmentId },
        data: {
          score: data.score,
          teacherComments: appended,
          status: AssignmentStatus.GRADED,
          gradedAt: new Date(),
        },
      });
    }

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
