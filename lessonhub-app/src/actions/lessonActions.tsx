// file: src/actions/lessonActions.tsx
'use server';

import prisma from "@/lib/prisma";
import { Role, AssignmentStatus, LessonType, PointReason, Prisma } from "@prisma/client";
import { revalidatePath } from 'next/cache';
import { getEmailTemplateByName } from '@/actions/adminActions';
import { createButton } from '@/lib/email-templates';
import { sendEmail } from '@/lib/email-templates.server';
import { auth } from "@/auth";
import { nanoid } from 'nanoid';
import { checkAndSendMilestoneEmail } from "./studentActions";
import { awardBadgesForStudent, calculateAssignmentPoints } from "@/lib/gamification";
import { hasAdminPrivileges } from "@/lib/authz";
import { EXTENSION_POINT_COST, isExtendedDeadline } from "@/lib/lessonExtensions";
import { convertExtraPointsToEuro } from "@/lib/points";
import { getComposerExtraTries, hashComposerSeed, normalizeComposerWord, parseComposerSentence } from "@/lib/composer";
import { validateAssignmentForSubmission } from "@/lib/assignmentValidation";
import { marked } from "marked";

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
        composerConfig: true,
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
        composerConfig: lesson.composerConfig
          ? {
              create: {
                hiddenSentence: lesson.composerConfig.hiddenSentence,
                questionBank: lesson.composerConfig.questionBank as Prisma.InputJsonValue,
                maxTries: lesson.composerConfig.maxTries ?? 1,
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

        const initialDeadline = new Date(Date.now() + 36 * 60 * 60 * 1000);
        const newAssignment = await prisma.assignment.create({
            data: {
                studentId: studentId,
                lessonId: lesson.id,
                deadline: initialDeadline,
                originalDeadline: initialDeadline,
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
    const validation = validateAssignmentForSubmission(assignment);
    if (!validation.ok) {
      return { success: false, error: validation.error };
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
        const validation = validateAssignmentForSubmission(assignment);
        if (!validation.ok) {
          return { success: false, error: validation.error };
        }

        let correctCount = 0;
        const processedAnswers = assignment.lesson.multiChoiceQuestions.map(q => {
            const selectedOptionId = answers[q.id];
            const selectedOptionIndex = q.options.findIndex(o => o.id === selectedOptionId);
            const selectedOption =
              selectedOptionIndex >= 0 ? q.options[selectedOptionIndex] : null;
            const correctOption = q.options.find(o => o.isCorrect);
            const isCorrect = selectedOptionId === correctOption?.id;
            if (isCorrect) correctCount++;
            return {
              questionId: q.id,
              selectedAnswerId: selectedOptionId,
              selectedAnswerText: selectedOption?.text ?? null,
              selectedAnswerIndex: selectedOptionIndex >= 0 ? selectedOptionIndex : null,
              isCorrect,
            };
        });

        const score = Math.round((correctCount / assignment.lesson.multiChoiceQuestions.length) * 10);

        const updatedAssignment = await prisma.assignment.update({
            where: { id: assignmentId },
            data: {
                answers: processedAnswers,
                status: AssignmentStatus.COMPLETED,
                score: score,
                rating: rating,
                draftAnswers: Prisma.JsonNull,
                draftRating: null,
                draftUpdatedAt: null,
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

export async function saveMultiChoiceAssignmentDraft(
  assignmentId: string,
  studentId: string,
  data: { answers: Record<string, string>; rating?: number | undefined }
) {
  try {
    const assignment = await prisma.assignment.findFirst({
      where: { id: assignmentId, studentId },
      select: { id: true, status: true },
    });
    if (!assignment) {
      return { success: false, error: 'Assignment not found or unauthorized.' };
    }
    if (assignment.status !== AssignmentStatus.PENDING) {
      return { success: false, error: 'Assignment can no longer be edited.' };
    }

    await prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        draftAnswers: data.answers as Prisma.InputJsonValue,
        draftRating: typeof data.rating === 'number' ? data.rating : null,
        draftUpdatedAt: new Date(),
      },
    });
    revalidatePath(`/assignments/${assignmentId}`);
    revalidatePath('/my-lessons');
    return { success: true };
  } catch (error) {
    console.error('Failed to save multi-choice draft:', error);
    return { success: false, error: 'Unable to save draft right now.' };
  }
}

export async function saveComposerAssignmentDraft(
  assignmentId: string,
  studentId: string,
  data: { answers: Record<number, string>; tries: Record<number, number>; rating?: number | undefined }
) {
  try {
    const assignment = await prisma.assignment.findFirst({
      where: { id: assignmentId, studentId },
      select: { id: true, status: true },
    });
    if (!assignment) {
      return { success: false, error: 'Assignment not found or unauthorized.' };
    }
    if (assignment.status !== AssignmentStatus.PENDING) {
      return { success: false, error: 'Assignment can no longer be edited.' };
    }

    await prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        draftAnswers: { answers: data.answers, tries: data.tries } as Prisma.InputJsonValue,
        draftRating: typeof data.rating === 'number' ? data.rating : null,
        draftUpdatedAt: new Date(),
      },
    });
    revalidatePath(`/assignments/${assignmentId}`);
    revalidatePath('/my-lessons');
    return { success: true };
  } catch (error) {
    console.error('Failed to save composer draft:', error);
    return { success: false, error: 'Unable to save draft right now.' };
  }
}

export async function submitComposerAssignment(
  assignmentId: string,
  studentId: string,
  data: { answers: Array<{ index: number; word: string; prompt?: string }>; tries?: Record<number, number>; rating?: number }
) {
  try {
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId, studentId },
      include: {
        student: true,
        lesson: {
          include: {
            composerConfig: true,
            teacher: true,
          },
        },
      },
    });
    if (!assignment || assignment.lesson.type !== LessonType.COMPOSER) {
      return { success: false, error: 'Assignment not found' };
    }
    const validation = validateAssignmentForSubmission(assignment);
    if (!validation.ok) {
      return { success: false, error: validation.error };
    }
    if (!assignment.lesson.composerConfig) {
      return { success: false, error: 'Composer configuration is missing.' };
    }

    const { words } = parseComposerSentence(assignment.lesson.composerConfig.hiddenSentence);
    if (words.length === 0) {
      return { success: false, error: 'Composer sentence is invalid.' };
    }

    const maxTries = assignment.lesson.composerConfig.maxTries ?? 1;
    const questionBank = Array.isArray(assignment.lesson.composerConfig.questionBank)
      ? (assignment.lesson.composerConfig.questionBank as Array<{
          id: string;
          prompt: string;
          answer: string;
          maxTries?: number | null;
        }>)
      : [];
    const questionsByWord = new Map<string, Array<{ prompt: string; answer: string; maxTries?: number | null }>>();
    questionBank.forEach((question) => {
      if (!question?.answer || !question?.prompt) return;
      const key = normalizeComposerWord(question.answer);
      if (!questionsByWord.has(key)) questionsByWord.set(key, []);
      questionsByWord.get(key)?.push(question);
    });

    const answersByIndex = new Map<number, { word: string; prompt?: string }>();
    const tries = data.tries ?? {};
    data.answers.forEach((answer) => {
      if (typeof answer.index === 'number' && answer.word) {
        answersByIndex.set(answer.index, { word: answer.word, prompt: answer.prompt });
      }
    });

    let correctCount = 0;
    const processedAnswers = words.map((word, index) => {
      const selection = answersByIndex.get(index);
      const selectedWord = selection?.word ?? '';
      const isCorrect = normalizeComposerWord(selectedWord) === normalizeComposerWord(word);
      if (isCorrect) correctCount += 1;
      const attempts = Number(tries?.[index] ?? 0);
      const candidates = questionsByWord.get(normalizeComposerWord(word)) ?? [];
      const seed = hashComposerSeed(`${assignment.id}-${word}-${index}`);
      const chosenQuestion = candidates.length > 0 ? candidates[seed % candidates.length] : null;
      return {
        index,
        prompt: chosenQuestion?.prompt ?? selection?.prompt ?? `Select the word that matches: "${word}".`,
        selectedWord,
        correctWord: word,
        tries: attempts,
        maxTries: chosenQuestion?.maxTries ?? null,
        isCorrect,
      };
    });

    const score = Math.round((correctCount / words.length) * 10);

    const totalExtraTries = processedAnswers.reduce((sum, answer) => {
      const attempts = Number(answer.tries ?? 0);
      const questionMax = Number(answer.maxTries ?? maxTries);
      const effectiveMax =
        Number.isInteger(questionMax) && questionMax > 0 ? questionMax : maxTries;
      if (!Number.isFinite(attempts) || attempts <= effectiveMax) return sum;
      return sum + (attempts - effectiveMax);
    }, 0);

    const pointsPenalty = totalExtraTries * 50;
    const updatedAssignment = await prisma.$transaction(async (tx) => {
      const updated = await tx.assignment.update({
        where: { id: assignmentId },
        data: {
          answers: processedAnswers as Prisma.InputJsonValue,
          status: AssignmentStatus.COMPLETED,
          score,
          rating: data.rating,
          draftAnswers: Prisma.JsonNull,
          draftRating: null,
          draftUpdatedAt: null,
        },
      });

      if (pointsPenalty > 0) {
        const currentPoints = assignment.student?.totalPoints ?? 0;
        await tx.user.update({
          where: { id: studentId },
          data: { totalPoints: currentPoints - pointsPenalty },
        });
        await tx.pointTransaction.create({
          data: {
            userId: studentId,
            assignmentId,
            points: -pointsPenalty,
            reason: PointReason.MANUAL_ADJUSTMENT,
            note: `Composer extra tries (${totalExtraTries}) — €${pointsPenalty} fee`,
          },
        });
      }

      return updated;
    });

    if (assignment.lesson.teacher?.email) {
      const submissionUrl = `${process.env.AUTH_URL}/dashboard/grade/${assignment.id}`;
      await sendEmail({
        to: assignment.lesson.teacher.email,
        templateName: 'submission_notification',
        data: {
          teacherName: assignment.lesson.teacher.name || 'teacher',
          studentName: assignment.student?.name || 'A student',
          lessonTitle: assignment.lesson.title,
          button: createButton('View Submission', submissionUrl),
        },
      });
    }

    revalidatePath('/my-lessons');
    await checkAndSendMilestoneEmail(studentId);
    return { success: true, data: updatedAssignment };
  } catch (error) {
    console.error('Failed to submit composer assignment:', error);
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
    const validation = validateAssignmentForSubmission(assignment);
    if (!validation.ok) {
      return { success: false, error: validation.error };
    }
    const updatedAssignment = await prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        answers: data.answers,
        studentNotes: data.studentNotes,
        rating: data.rating,
        status: AssignmentStatus.COMPLETED,
        draftAnswers: Prisma.JsonNull,
        draftStudentNotes: null,
        draftRating: null,
        draftUpdatedAt: null,
        lyricDraftAnswers: Prisma.JsonNull,
        lyricDraftMode: null,
        lyricDraftReadSwitches: null,
        lyricDraftUpdatedAt: null,
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

export async function saveStandardAssignmentDraft(
  assignmentId: string,
  studentId: string,
  data: { answers: string[]; studentNotes: string; rating?: number }
) {
  try {
    const assignment = await prisma.assignment.findFirst({
      where: { id: assignmentId, studentId },
      select: { id: true, status: true },
    });
    if (!assignment) {
      return { success: false, error: "Assignment not found or unauthorized." };
    }
    if (assignment.status !== AssignmentStatus.PENDING) {
      return { success: false, error: "Assignment can no longer be edited." };
    }

    await prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        draftAnswers: data.answers as Prisma.InputJsonValue,
        draftStudentNotes: data.studentNotes || null,
        draftRating: typeof data.rating === "number" ? data.rating : null,
        draftUpdatedAt: new Date(),
      },
    });

    revalidatePath(`/assignments/${assignmentId}`);
    revalidatePath('/my-lessons');
    return { success: true };
  } catch (error) {
    console.error("Failed to save draft:", error);
    return { success: false, error: "Unable to save draft right now." };
  }
}

export async function getLessonsForTeacher(teacherId: string) {
  try {
    const lessons = await prisma.lesson.findMany({
      where: { teacherId: teacherId },
      select: {
        id: true,
        title: true,
        type: true,
        price: true,
        isFreeForAll: true,
        guideIsFreeForAll: true,
        guideIsVisible: true,
        lesson_preview: true,
        difficulty: true,
        assignment_text: true,
        createdAt: true,
        updatedAt: true,
        scheduled_assignment_date: true,
        guideCardImage: true,
        teacherId: true,
        assignments: {
          select: {
            status: true,
            deadline: true,
            startDate: true,
            assignedAt: true,
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
          },
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
  price: number;
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
        price: true,
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
      price: guide.price ? Number(guide.price) : 0,
      updatedAt: guide.updatedAt.toISOString(),
      cardCount: guide.learningSessionCards.length,
      guideCardImage: guide.guideCardImage ?? '/my-guides/defaultcard.png',
      guideIsVisible: guide.guideIsVisible ?? true,
      guideIsFreeForAll: guide.guideIsFreeForAll ?? false,
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
      guideIsVisible: guide.guideIsVisible ?? true,
      guideIsFreeForAll: guide.guideIsFreeForAll ?? false,
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
        const baseLessonSelect = {
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
            composerConfig: {
                select: {
                    hiddenSentence: true,
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
            _count: { select: { assignments: true, multiChoiceQuestions: true } },
        } as const;

        const fetchAssignments = async (lessonSelect: typeof baseLessonSelect) => {
            return prisma.assignment.findMany({
                where: {
                    studentId: studentId,
                },
                select: {
                    id: true,
                    assignedAt: true,
                    startDate: true,
                    deadline: true,
                    originalDeadline: true,
                    status: true,
                    score: true,
                    pointsAwarded: true,
                    gradedAt: true,
                    studentNotes: true,
                    rating: true,
                    answers: true,
                    draftAnswers: true,
                    teacherComments: true,
                    // teacherAnswerComments intentionally omitted for DBs without the column
                    reminderSentAt: true,
                    milestoneNotified: true,
                    notifyOnStartDate: true,
                    lessonId: true,
                    studentId: true,
                    lesson: {
                        select: lessonSelect,
                    },
                },
                orderBy: { deadline: 'asc' },
            });
        };

        const lessonSelectWithFreeFlags = {
            ...baseLessonSelect,
            isFreeForAll: true,
            guideIsFreeForAll: true,
        } as const;
        const lessonSelectWithIsFree = {
            ...baseLessonSelect,
            isFreeForAll: true,
        } as const;

        try {
            return await fetchAssignments(lessonSelectWithFreeFlags);
        } catch (err: unknown) {
            const message = (err as Error)?.message || '';
            if (message.includes('guideIsFreeForAll')) {
                console.warn('Lesson guide free flag missing; falling back to isFreeForAll only.');
                try {
                    return await fetchAssignments(lessonSelectWithIsFree);
                } catch (innerErr: unknown) {
                    const innerMessage = (innerErr as Error)?.message || '';
                    if (innerMessage.includes('isFreeForAll')) {
                        console.warn('Lesson free flags missing; falling back without select.');
                        return fetchAssignments(baseLessonSelect);
                    }
                    throw innerErr;
                }
            }
            if (message.includes('isFreeForAll')) {
                console.warn('Lesson free flag missing; falling back without select.');
                return fetchAssignments(baseLessonSelect);
            }
            throw err;
        }
    } catch (error) {
        console.error("Failed to fetch assignments for student:", error);
        return [];
    }
}

export async function getAssignmentById(assignmentId: string, studentId: string) {
  try {
    const assignment = await prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        OR: [
          { studentId },
          {
            lesson: {
              teacherId: studentId,
            },
          },
        ],
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
            learningSessionCards: {
              orderBy: { orderIndex: 'asc' },
            },
            lyricConfig: true,
            composerConfig: true,
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
        composerConfig: true,
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
        composerConfig: true,
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
                OR: [
                  { lesson: { teacherId } },
                  { student: { teachers: { some: { teacherId } } } },
                ],
            },
            include: {
                student: true,
                lesson: {
                    include: {
                        flashcards: true,
                        learningSessionCards: true,
                        multiChoiceQuestions: {
                            include: {
                                options: true,
                            },
                        },
                        lyricConfig: true,
                        composerConfig: true,
                    },
                },
            },
        });
        if (!submission) {
            return null;
        }

        const lyricAttempts = submission.lesson.type === LessonType.LYRIC
            ? await prisma.lyricLessonAttempt.findMany({
                where: {
                    lessonId: submission.lessonId,
                    studentId: submission.studentId,
                },
                orderBy: { createdAt: 'desc' },
                take: 1,
            })
            : [];

        return {
            ...submission,
            lesson: {
                ...submission.lesson,
                lyricAttempts,
            },
        };
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

    const [assignments, goldStarsSum] = await Promise.all([
      prisma.assignment.findMany({
        where: {
          studentId: studentId,
        },
        select: {
          id: true,
          status: true,
          score: true,
          pointsAwarded: true,
          extraPoints: true,
          deadline: true,
          originalDeadline: true,
          answers: true,
          lesson: { select: { price: true, type: true, composerConfig: { select: { maxTries: true } } } },
        },
      }),
      prisma.goldStar.aggregate({
        where: { studentId },
        _sum: { amountEuro: true },
      }),
    ]);

    let totalValue = 0;
    let extensionSpend = 0;

    assignments.forEach((a) => {
      const price = a.lesson.price.toNumber();
      const isExtended = isExtendedDeadline(a.deadline, a.originalDeadline);
      if (
        a.lesson.type === LessonType.COMPOSER &&
        (a.status === AssignmentStatus.GRADED || a.status === AssignmentStatus.FAILED)
      ) {
        const extraTries = getComposerExtraTries(a.answers, a.lesson.composerConfig?.maxTries ?? 1);
        totalValue -= extraTries * 50;
      }

      if (a.status === AssignmentStatus.FAILED) {
        totalValue -= price;
      } else if (a.status === AssignmentStatus.GRADED && a.score !== null && a.score >= 0) {
        totalValue += price;
      }
      if (a.status === AssignmentStatus.GRADED && a.extraPoints) {
        totalValue += convertExtraPointsToEuro(a.extraPoints);
      }

      if (isExtended) {
        extensionSpend += EXTENSION_POINT_COST;
      }
    });

    totalValue -= extensionSpend;
    const goldStarValue = goldStarsSum._sum.amountEuro ?? 0;
    totalValue += goldStarValue;

    const derivedPoints = assignments.reduce((sum, assignment) => sum + (assignment.pointsAwarded ?? 0), 0);
    const totalPoints = student.totalPoints ?? derivedPoints;
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

    const isAdmin = hasAdminPrivileges(session.user);
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
    revalidatePath('/my-lessons');
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

type ExtensionActor = "teacher" | "student";

async function applyDeadlineExtension(assignmentId: string, actor: ExtensionActor) {
  const session = await auth();
  const isTeacher = session?.user?.role === Role.TEACHER;
  const isStudent = session?.user?.role === Role.STUDENT;
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  if ((actor === "teacher" && !isTeacher) || (actor === "student" && !isStudent)) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const assignment = await prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        ...(actor === "teacher"
          ? { lesson: { teacherId: session.user.id } }
          : { studentId: session.user.id }),
      },
      include: {
        student: {
          select: {
            id: true,
            totalPoints: true,
          },
        },
        lesson: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!assignment) {
      const notFoundMessage =
        actor === "student"
          ? "Assignment not found."
          : "Assignment not found or you do not have access to it.";
      return { success: false, error: notFoundMessage };
    }

    const existingExtensionTransaction = await prisma.pointTransaction.findFirst({
      where: {
        assignmentId,
        userId: assignment.studentId,
        points: -EXTENSION_POINT_COST,
        note: { contains: "Lesson extension" },
      },
      select: { id: true },
    });
    if (existingExtensionTransaction) {
      return {
        success: false,
        error: "This lesson has already used its extension.",
      };
    }

    const availablePoints = assignment.student?.totalPoints ?? 0;
    if (availablePoints < EXTENSION_POINT_COST) {
      const insufficientMessage =
        actor === "student"
          ? `You need at least ${EXTENSION_POINT_COST} points to request an extension.`
          : `This student needs at least ${EXTENSION_POINT_COST} points available to extend this lesson.`;
      return {
        success: false,
        error: insufficientMessage,
      };
    }

    const now = new Date();
    const baseDeadline =
      assignment.deadline && assignment.deadline > now ? assignment.deadline : now;
    const newDeadline = new Date(baseDeadline.getTime() + 48 * 60 * 60 * 1000);

    const result = await prisma.$transaction(async (tx) => {
      const updatedAssignment = await tx.assignment.update({
        where: { id: assignmentId },
        data: {
          deadline: newDeadline,
          status: AssignmentStatus.PENDING,
          originalDeadline: assignment.originalDeadline ?? assignment.deadline,
        },
      });

      const remainingPoints = availablePoints - EXTENSION_POINT_COST;
      await tx.user.update({
        where: { id: assignment.studentId },
        data: { totalPoints: remainingPoints },
      });

      await tx.pointTransaction.create({
        data: {
          userId: assignment.studentId,
          assignmentId,
          points: -EXTENSION_POINT_COST,
          reason: PointReason.MANUAL_ADJUSTMENT,
          note: `Lesson extension for ${assignment.lesson?.title ?? "lesson"}`,
        },
      });

      return { updatedAssignment, remainingPoints };
    });

    revalidatePath(`/assignments/${assignmentId}`);
    revalidatePath("/my-lessons");
    revalidatePath(`/dashboard/submissions/${assignment.lessonId}`);

    return {
      success: true,
      newDeadline: result.updatedAssignment.deadline,
      remainingPoints: result.remainingPoints,
    };
  } catch (error) {
    console.error("Failed to extend deadline:", error);
    return { success: false, error: "An error occurred." };
  }
}

export async function extendDeadline(assignmentId: string) {
  return applyDeadlineExtension(assignmentId, "teacher");
}

export async function requestStudentExtension(assignmentId: string) {
  return applyDeadlineExtension(assignmentId, "student");
}

export async function gradeAssignment(
  assignmentId: string,
  data: {
    score: number;
    teacherComments: string;
    extraPoints?: number;
    answerComments?: Record<number, string>;
  }
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== Role.TEACHER) {
    return { success: false, error: "Unauthorized" };
  }

  if (typeof data.score !== 'number' || Number.isNaN(data.score) || !Number.isFinite(data.score)) {
    return { success: false, error: "Score is required to grade this assignment." };
  }
  const extraPoints =
    typeof data.extraPoints === 'number' && Number.isFinite(data.extraPoints)
      ? Math.trunc(data.extraPoints)
      : 0;
  if (extraPoints < 0) {
    return { success: false, error: "Extra points must be zero or greater." };
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
    const basePoints = calculateAssignmentPoints({
      score: data.score,
      difficulty: assignment.lesson?.difficulty ?? null,
      deadline: assignment.deadline,
      gradedAt: now,
      assignedAt: assignment.assignedAt,
    });
    const pointsAwarded = Math.max(0, basePoints + extraPoints);

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
            extraPoints,
            gradedByTeacher: true,
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
            extraPoints,
            gradedByTeacher: true,
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
            note: `Scored ${data.score}/10 on ${assignment.lesson.title}${
              extraPoints > 0 ? ` (+${extraPoints} bonus points)` : ''
            }`,
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
        const teacherCommentsHtml = data.teacherComments
          ? ((await marked.parse(data.teacherComments, { breaks: true })) as string)
          : '';
        const extraPointsLineEn =
          extraPoints > 0
            ? `<p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;"><strong>Bonus points:</strong> ${extraPoints}</p>`
            : '';
        const extraPointsLineIt =
          extraPoints > 0
            ? `<p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;"><strong>Punti bonus:</strong> ${extraPoints}</p>`
            : '';
        await sendEmail({
          to: assignment.student.email,
          templateName: 'graded',
          data: {
            studentName: assignment.student.name || 'student',
            lessonTitle: assignment.lesson.title,
            score: data.score.toString(),
            extraPointsLineEn,
            extraPointsLineIt,
            teacherComments: teacherCommentsHtml
              ? `<div style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;"><strong>Teacher's Feedback:</strong><div style="margin-top: 8px;">${teacherCommentsHtml}</div></div>`
              : '',
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

export async function getFreeForAllLessons(studentId: string) {
  try {
    // 1. Get IDs of lessons already assigned to the student
    const assignedLessonIds = await prisma.assignment.findMany({
      where: { studentId },
      select: { lessonId: true },
    });
    const excludeIds = assignedLessonIds.map(a => a.lessonId).filter(Boolean);
    const whereClause: Prisma.LessonWhereInput = {
      isFreeForAll: true,
      type: { not: LessonType.LEARNING_SESSION },
    };

    // Avoid Prisma's empty-notIn guard which would otherwise hide all free lessons
    if (excludeIds.length > 0) {
      whereClause.id = { notIn: excludeIds };
    }

    // 2. Fetch free lessons not in that list, excluding guides
    const lessons = await prisma.lesson.findMany({
      where: whereClause,
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        _count: {
          select: { assignments: true },
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    return lessons.map(lesson => ({
      id: lesson.id,
      title: lesson.title,
      type: lesson.type,
      lesson_preview: lesson.lesson_preview,
      assignment_image_url: lesson.assignment_image_url,
      price: lesson.price.toNumber(),
      difficulty: lesson.difficulty,
      teacher: lesson.teacher,
      completionCount: lesson._count.assignments,
    }));
  } catch (error) {
    console.error("Failed to fetch free lessons:", error);
    return [];
  }
}

export async function startFreeLesson(lessonId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }
  const studentId = session.user.id;

  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
    });

    if (!lesson) {
      return { success: false, error: "Lesson not found." };
    }

    if (!lesson.isFreeForAll) {
      return { success: false, error: "This lesson is not free." };
    }

    // Check if already assigned
    const existing = await prisma.assignment.findUnique({
      where: {
        lessonId_studentId: {
          lessonId,
          studentId,
        },
      },
    });

    if (existing) {
      return { success: true, assignmentId: existing.id };
    }

    // Create new assignment
    // Default deadline: 7 days from now
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 7);

    const newAssignment = await prisma.assignment.create({
      data: {
        studentId,
        lessonId,
        deadline,
        originalDeadline: deadline,
        status: AssignmentStatus.PENDING,
      },
    });

    revalidatePath('/my-lessons');
    return { success: true, assignmentId: newAssignment.id };
  } catch (error) {
    console.error("Failed to start free lesson:", error);
    return { success: false, error: "Failed to start lesson." };
  }
}

export async function saveLyricAssignmentDraft(
  assignmentId: string,
  studentId: string,
  data: {
    answers: Record<string, string[]>;
    mode: 'read' | 'fill';
    readModeSwitches: number;
  }
) {
  try {
    const assignment = await prisma.assignment.findFirst({
      where: { id: assignmentId, studentId },
      select: { id: true, status: true },
    });
    if (!assignment) return { success: false, error: 'Assignment not found or unauthorized.' };
    if (assignment.status !== AssignmentStatus.PENDING) {
      return { success: false, error: 'Assignment can no longer be edited.' };
    }

    await prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        lyricDraftAnswers: data.answers as Prisma.InputJsonValue,
        lyricDraftMode: data.mode,
        lyricDraftReadSwitches: Math.max(0, data.readModeSwitches),
        lyricDraftUpdatedAt: new Date(),
      },
    });
    revalidatePath(`/assignments/${assignmentId}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to save lyric draft:', error);
    return { success: false, error: 'Unable to save draft right now.' };
  }
}

export async function recordLessonUsageForLatestLogin(userId: string, lessonId: string) {
  if (!userId || !lessonId) return;
  try {
    const recentLessonEvent = await prisma.loginEvent.findFirst({
      where: {
        userId,
        lessonId,
        createdAt: {
          gte: new Date(Date.now() - 10 * 60 * 1000), // ignore duplicates within 10 minutes
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentLessonEvent) return;

    await prisma.loginEvent.create({
      data: {
        userId,
        lessonId,
      },
    });
  } catch (error) {
    console.error('LOGIN_EVENT_LESSON_UPDATE_ERROR', error);
  }
}
