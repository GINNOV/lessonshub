// file: src/actions/lessonActions.tsx
'use server';

import prisma from "@/lib/prisma";
import { Role, AssignmentStatus, LessonType, PointReason, Prisma } from "@prisma/client";
import { revalidatePath } from 'next/cache';
import { getEmailTemplateByName } from '@/actions/adminActions';
import { createButton, sendEmail } from '@/lib/email-templates';
import { auth } from "@/auth";
import { nanoid } from 'nanoid';
import { checkAndSendMilestoneEmail } from "./studentActions";
import { awardBadgesForStudent, calculateAssignmentPoints } from "@/lib/gamification";

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
        select: {
          teacherId: true,
          classId: true,
          class: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: { name: 'asc' }
  });

  return students.map((student: any) => {
    const totalPoints = student.assignments.reduce((sum: number, a: any) => sum + (a.score || 0), 0);
    const { assignments, ...studentData } = student;
    const linkArr: Array<{
      teacherId: string;
      classId: string | null;
      class?: { id: string; name: string | null } | null;
    }> = student.teachers || [];
    const currentClassId = teacherId
      ? (linkArr.find(l => l.teacherId === teacherId)?.classId ?? null)
      : null;
    const currentClassName = teacherId
      ? (linkArr.find(l => l.teacherId === teacherId)?.class?.name ?? null)
      : null;
    const serializableStudent = {
      ...studentData,
      defaultLessonPrice: studentData.defaultLessonPrice?.toNumber?.() ?? null,
      referralRewardPercent: studentData.referralRewardPercent
        ? Number(studentData.referralRewardPercent.toString())
        : 0,
      referralRewardMonthlyAmount: studentData.referralRewardMonthlyAmount
        ? Number(studentData.referralRewardMonthlyAmount.toString())
        : 0,
      currentClassId,
      currentClassName,
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
        learningSessionCards: true,
        lyricConfig: true,
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
        difficulty: lesson.difficulty,
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
        learningSessionCards: lesson.learningSessionCards.length
          ? {
              create: lesson.learningSessionCards
                .sort((a, b) => a.orderIndex - b.orderIndex)
                .map((card) => ({
                  orderIndex: card.orderIndex,
                  content1: card.content1,
                  content2: card.content2,
                  content3: card.content3,
                  content4: card.content4,
                  extra: card.extra,
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
        lyricConfig: lesson.lyricConfig
          ? {
              create: {
                audioUrl: lesson.lyricConfig.audioUrl,
                audioStorageKey: lesson.lyricConfig.audioStorageKey,
                rawLyrics: lesson.lyricConfig.rawLyrics,
                lines: lesson.lyricConfig.lines as Prisma.InputJsonValue,
                settings: lesson.lyricConfig.settings as Prisma.InputJsonValue | undefined,
              },
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
    if (new Date() > new Date(assignment.deadline)) {
      return { success: false, error: "The deadline for this assignment has passed." };
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
        if (assignment.status !== AssignmentStatus.PENDING) {
          return { success: false, error: 'Assignment has already been submitted.' };
        }
        if (new Date() > new Date(assignment.deadline)) {
          return { success: false, error: "The deadline for this assignment has passed." };
        }

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
            startDate: true,
            student: {
              select: {
                teachers: {
                  where: { teacherId },
                  select: {
                    classId: true,
                    class: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            },
          }
          ,
          orderBy: {
            deadline: 'asc',
          },
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

export type HubGuideSummary = {
  id: string;
  title: string;
  lessonPreview: string | null;
  difficulty: number;
  updatedAt: string;
  cardCount: number;
  guideCardImage: string | null;
  guideIsVisible: boolean;
  guideIsFreeForAll: boolean;
};

export type HubGuideDetail = {
  id: string;
  title: string;
  lessonPreview: string | null;
  assignmentText: string | null;
  updatedAt: string;
  guideCardImage: string | null;
  guideIsVisible: boolean;
  guideIsFreeForAll: boolean;
  learningSessionCards: {
    id: string;
    orderIndex: number;
    content1: string | null;
    content2: string | null;
    content3: string | null;
    content4: string | null;
    extra: string | null;
  }[];
};

export async function getHubGuides(): Promise<HubGuideSummary[]> {
  try {
    const guides = await prisma.lesson.findMany({
      where: { type: LessonType.LEARNING_SESSION },
      select: {
        id: true,
        title: true,
        lesson_preview: true,
        difficulty: true,
        updatedAt: true,
        guideCardImage: true,
        guideIsVisible: true,
        guideIsFreeForAll: true,
        learningSessionCards: {
          select: {
            id: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

      return guides.map((guide) => ({
        id: guide.id,
        title: guide.title,
        lessonPreview: guide.lesson_preview,
        difficulty: guide.difficulty,
        updatedAt: guide.updatedAt.toISOString(),
      cardCount: guide.learningSessionCards.length,
      guideCardImage: guide.guideCardImage ?? '/my-guides/defaultcard.png',
        guideIsVisible: guide.guideIsVisible,
        guideIsFreeForAll: guide.guideIsFreeForAll,
    }));
  } catch (error) {
    console.error("Failed to fetch hub guides:", error);
    return [];
  }
}

export async function getHubGuideById(lessonId: string): Promise<HubGuideDetail | null> {
  try {
    const guide = await prisma.lesson.findFirst({
      where: { id: lessonId, type: LessonType.LEARNING_SESSION },
      select: {
        id: true,
        title: true,
        lesson_preview: true,
        assignment_text: true,
        updatedAt: true,
        guideCardImage: true,
        guideIsVisible: true,
        guideIsFreeForAll: true,
        learningSessionCards: {
          select: {
            id: true,
            orderIndex: true,
            content1: true,
            content2: true,
            content3: true,
            content4: true,
            extra: true,
          },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!guide) {
      return null;
    }

    return {
      id: guide.id,
      title: guide.title,
      lessonPreview: guide.lesson_preview,
      assignmentText: guide.assignment_text,
      updatedAt: guide.updatedAt.toISOString(),
      guideCardImage: guide.guideCardImage ?? '/my-guides/defaultcard.png',
      guideIsVisible: guide.guideIsVisible,
      guideIsFreeForAll: guide.guideIsFreeForAll,
      learningSessionCards: guide.learningSessionCards.map((card) => ({
        ...card,
      })),
    };
  } catch (error) {
    console.error("Failed to fetch hub guide:", error);
    return null;
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
                pointsAwarded: true,
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
                        difficulty: true,
                        assignments: {
                            select: {
                                status: true,
                            },
                        },
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
            learningSessionCards: {
              orderBy: { orderIndex: 'asc' },
            },
            lyricConfig: true,
            lyricAttempts: {
              where: { studentId },
              orderBy: { createdAt: 'desc' },
              take: 1,
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
        learningSessionCards: {
          orderBy: { orderIndex: 'asc' },
        },
        multiChoiceQuestions: {
          include: {
            options: true,
          },
        },
        lyricConfig: true,
      },
    });
    return lesson;
  } catch (error) {
    console.error("Failed to fetch lesson:", error);
    return null;
  }
}

export async function getLessonByShareId(shareId: string) {
  try {
    const lesson = await prisma.lesson.findFirst({
      where: { public_share_id: shareId },
      include: {
        flashcards: {
          select: {
            id: true,
            term: true,
            definition: true,
            termImageUrl: true,
            definitionImageUrl: true,
            lessonId: true,
          },
        },
        learningSessionCards: {
          orderBy: { orderIndex: 'asc' },
        },
        multiChoiceQuestions: {
          include: {
            options: true,
          },
        },
        lyricConfig: true,
        teacher: {
          select: {
            id: true,
            name: true,
            image: true,
            defaultLessonPrice: true,
          },
        },
      },
    });

    if (!lesson) {
      return null;
    }

    return {
      ...lesson,
      price: lesson.price.toNumber(),
      teacher: lesson.teacher
        ? {
            ...lesson.teacher,
            defaultLessonPrice: lesson.teacher.defaultLessonPrice?.toNumber() ?? null,
          }
        : null,
    };
  } catch (error) {
    console.error("Failed to fetch shared lesson:", error);
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
        student: {
          include: {
            teachers: {
              where: { teacherId },
              include: {
                class: true,
              },
            },
          },
        },
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
    return { totalValue: 0, totalPoints: 0 };
  }
  try {
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { isPaying: true, totalPoints: true },
    });

    if (!student?.isPaying) {
      return { totalValue: 0, totalPoints: student?.totalPoints ?? 0 };
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
        pointsAwarded: true,
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
    const derivedPoints = assignments.reduce((sum, assignment) => sum + (assignment.pointsAwarded ?? 0), 0);
    const totalPoints = Math.max(student.totalPoints ?? 0, derivedPoints);
    return { totalValue, totalPoints };
  } catch (error) {
    console.error("Failed to calculate student stats:", error);
    return { totalValue: 0, totalPoints: 0 };
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

export async function ensureLessonShareLink(lessonId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { public_share_id: true, teacherId: true },
    });

    if (!lesson) {
      return { success: false, error: 'Lesson not found.' };
    }

    const isAdmin = session.user.role === Role.ADMIN;
    const isLessonTeacher =
      session.user.role === Role.TEACHER && lesson.teacherId === session.user.id;

    if (!isAdmin && !isLessonTeacher) {
      const assignment = await prisma.assignment.findFirst({
        where: { lessonId, studentId: session.user.id },
        select: { id: true },
      });

      if (!assignment) {
        return { success: false, error: 'Unauthorized' };
      }
    }

    let shareId = lesson.public_share_id;
    if (!shareId) {
      shareId = nanoid(12);
      await prisma.lesson.update({
        where: { id: lessonId },
        data: { public_share_id: shareId },
      });
    }

    return { success: true, shareId };
  } catch (error) {
    console.error("Failed to ensure lesson share link:", error);
    return { success: false, error: 'Failed to ensure share link.' };
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

    const now = new Date();
    const pointsAwarded = calculateAssignmentPoints({
      score: data.score,
      difficulty: assignment.lesson?.difficulty ?? null,
      deadline: assignment.deadline,
      gradedAt: now,
      assignedAt: assignment.assignedAt,
    });

    const gradingOutcome = await prisma.$transaction(async (tx) => {
      let updatedAssignment;
      try {
        updatedAssignment = await tx.assignment.update({
          where: { id: assignmentId },
          data: {
            score: data.score,
            teacherComments: data.teacherComments,
            teacherAnswerComments:
              data.answerComments && Object.keys(data.answerComments).length > 0
                ? (data.answerComments as unknown as object)
                : undefined,
            status: AssignmentStatus.GRADED,
            gradedAt: now,
            pointsAwarded,
          },
        });
      } catch (err) {
        const hasPerAnswer = data.answerComments && Object.keys(data.answerComments).length > 0;
        const appended = hasPerAnswer
          ? `${data.teacherComments || ''}\n\nPer-answer comments:\n${Object.entries(data.answerComments as Record<number, string>)
              .map(([i, c]) => `- Q${Number(i) + 1}: ${c}`)
              .join('\n')}`
          : data.teacherComments;

        updatedAssignment = await tx.assignment.update({
          where: { id: assignmentId },
          data: {
            score: data.score,
            teacherComments: appended,
            status: AssignmentStatus.GRADED,
            gradedAt: now,
            pointsAwarded,
          },
        });
      }

      const previousPoints = assignment.pointsAwarded ?? 0;
      const pointsDelta = pointsAwarded - previousPoints;
      let totalPoints = assignment.student.totalPoints ?? 0;

      if (pointsDelta !== 0) {
        totalPoints += pointsDelta;
        await tx.user.update({
          where: { id: assignment.studentId },
          data: {
            totalPoints,
          },
        });

        await tx.pointTransaction.create({
          data: {
            userId: assignment.studentId,
            assignmentId,
            points: pointsDelta,
            reason: PointReason.ASSIGNMENT_GRADED,
            note: `Scored ${data.score}/10 on ${assignment.lesson.title}`,
          },
        });
      }

      const badgeResult = await awardBadgesForStudent({
        tx,
        studentId: assignment.studentId,
        assignmentId,
        score: data.score,
        totalPoints,
      });

      return {
        updatedAssignment,
        pointsAwarded,
        pointsDelta,
        totalPoints: badgeResult.totalPoints,
        awardedBadges: badgeResult.awardedBadges,
      };
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
    revalidatePath('/dashboard');
    return {
      success: true,
      pointsDelta: gradingOutcome.pointsDelta,
      totalPoints: gradingOutcome.totalPoints,
      awardedBadges: gradingOutcome.awardedBadges,
    };

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
