import { GoogleGenerativeAI } from '@google/generative-ai'
import { AutomationJobKind, AutomationJobRunStatus, LessonType, Prisma } from '@prisma/client'

import prisma from '@/lib/prisma'
import { getGeminiApiKey } from '@/lib/aiConfig'
import { applyAutomationAssignments } from '@/lib/automationAssignments'

const DEFAULT_THEME_POOL = [
  'viaggi e spostamenti',
  'ristorante e ordinazioni',
  'routine quotidiana',
  'colloquio di lavoro',
  'dare indicazioni',
  'shopping e negozi',
  'check-in in hotel',
  'telefonate quotidiane',
  'piccole conversazioni',
  'salute e appuntamenti',
  'meteo e stagioni',
  'raccontare il passato',
]

type GeneratedLesson = {
  title: string
  lesson_preview: string
  assignmentText: string
  questions: Array<{
    question: string
    expectedAnswer: string
  }>
}

type RunSummary = {
  ok: boolean
  jobId: string
  jobName: string
  status: AutomationJobRunStatus
  message: string
  lessonId?: string
}

function getRunDateKey(referenceDate: Date) {
  return new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), referenceDate.getUTCDate()))
}

function getItalianDate(referenceDate: Date) {
  return new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(referenceDate)
}

function getThemePool(themePool: unknown) {
  if (!Array.isArray(themePool)) return DEFAULT_THEME_POOL
  const values = themePool
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
  return values.length ? values : DEFAULT_THEME_POOL
}

function getTopicForDate(referenceDate: Date, themePool: string[]) {
  const startOfYear = Date.UTC(referenceDate.getUTCFullYear(), 0, 1)
  const diffDays = Math.floor((referenceDate.getTime() - startOfYear) / 86400000)
  return themePool[((diffDays % themePool.length) + themePool.length) % themePool.length]
}

function sanitizeGeneratedLesson(input: unknown): GeneratedLesson | null {
  if (!input || typeof input !== 'object') return null
  const payload = input as Record<string, unknown>
  const title = typeof payload.title === 'string' ? payload.title.trim() : ''
  const lessonPreview =
    typeof payload.lesson_preview === 'string' ? payload.lesson_preview.trim() : ''
  const assignmentText =
    typeof payload.assignmentText === 'string' ? payload.assignmentText.trim() : ''
  const rawQuestions = Array.isArray(payload.questions) ? payload.questions : []
  const questions = rawQuestions
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const record = item as Record<string, unknown>
      const question = typeof record.question === 'string' ? record.question.trim() : ''
      const expectedAnswer =
        typeof record.expectedAnswer === 'string' ? record.expectedAnswer.trim() : ''
      if (!question || !expectedAnswer) return null
      return { question, expectedAnswer }
    })
    .filter((item): item is { question: string; expectedAnswer: string } => item !== null)

  if (!title || !lessonPreview || !assignmentText || questions.length < 3) {
    return null
  }

  return {
    title,
    lesson_preview: lessonPreview,
    assignmentText,
    questions,
  }
}

async function generateLessonWithGemini(args: {
  geminiApiKey: string
  topic: string
  dateLabel: string
  customPrompt: string | null
}): Promise<GeneratedLesson> {
  const genAI = new GoogleGenerativeAI(args.geminiApiKey)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash-preview-09-2025',
    generationConfig: {
      responseMimeType: 'application/json',
    },
  })

  const prompt = `
Genera una lezione standard in italiano per studenti.

Vincoli obbligatori:
- Scrivi tutto in italiano.
- Il titolo deve essere creativo, naturale e adatto a studenti veri.
- Il titolo deve includere in modo naturale la data "${args.dateLabel}".
- Non usare parole come "Codex", "automazione", "lezione giornaliera" o formule meccaniche.
- Il lesson_preview deve essere breve, chiaro e invitante.
- assignmentText deve essere breve, semplice e facile da seguire.
- Genera almeno 3 domande aperte coerenti con il tema.
- Ogni domanda deve avere expectedAnswer breve ma utile.
- Il tema del giorno è: "${args.topic}".

Prompt aggiuntivo dell'admin:
${args.customPrompt ?? 'Nessuno.'}

Rispondi solo con JSON valido in questo formato:
{
  "title": "string",
  "lesson_preview": "string",
  "assignmentText": "string",
  "questions": [
    { "question": "string", "expectedAnswer": "string" }
  ]
}
  `.trim()

  const result = await model.generateContent(prompt)
  const rawText = result.response.text()
  let parsed: unknown
  try {
    parsed = JSON.parse(rawText)
  } catch {
    throw new Error('Gemini returned invalid JSON for the daily lesson.')
  }

  const lesson = sanitizeGeneratedLesson(parsed)
  if (!lesson) {
    throw new Error('Gemini response was missing required lesson fields.')
  }

  return lesson
}

async function updateRunAndJob(args: {
  jobId: string
  runDate: Date
  status: AutomationJobRunStatus
  message: string
  lessonId?: string
}) {
  await prisma.$transaction([
    prisma.automationJobRun.update({
      where: {
        jobId_runDate: {
          jobId: args.jobId,
          runDate: args.runDate,
        },
      },
      data: {
        status: args.status,
        message: args.message,
        lessonId: args.lessonId,
      },
    }),
    prisma.automationJob.update({
      where: { id: args.jobId },
      data: {
        lastRunAt: new Date(),
        lastStatus: args.status,
        lastMessage: args.message,
        lastLessonId: args.lessonId ?? null,
      },
    }),
  ])
}

export async function runDailyLessonAutomations(referenceDate = new Date()): Promise<RunSummary[]> {
  const runDate = getRunDateKey(referenceDate)
  const geminiApiKey = await getGeminiApiKey()
  if (!geminiApiKey) {
    return [
      {
        ok: false,
        jobId: 'global',
        jobName: 'Daily lesson automation',
        status: AutomationJobRunStatus.FAILED,
        message: 'Gemini API key is not configured.',
      },
    ]
  }

  const jobs = await prisma.automationJob.findMany({
    where: {
      isEnabled: true,
      kind: AutomationJobKind.DAILY_STANDARD_LESSON,
      teacher: { isSuspended: false },
      class: { isActive: true },
    },
    include: {
      teacher: {
        select: {
          id: true,
          name: true,
        },
      },
      class: {
        select: {
          id: true,
          name: true,
          isActive: true,
        },
      },
      runs: {
        where: { runDate },
        take: 1,
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  const results: RunSummary[] = []

  for (const job of jobs) {
    const existingRun = job.runs[0]
    if (existingRun?.status === AutomationJobRunStatus.SUCCESS || existingRun?.status === AutomationJobRunStatus.SKIPPED) {
      results.push({
        ok: existingRun.status === AutomationJobRunStatus.SUCCESS,
        jobId: job.id,
        jobName: job.name,
        status: existingRun.status,
        message: existingRun.message ?? 'Already processed for today.',
        lessonId: existingRun.lessonId ?? undefined,
      })
      continue
    }

    if (!existingRun) {
      try {
        await prisma.automationJobRun.create({
          data: {
            jobId: job.id,
            runDate,
            status: AutomationJobRunStatus.PENDING,
            message: 'Automation run started.',
          },
        })
      } catch (error) {
        const rerun = await prisma.automationJobRun.findUnique({
          where: {
            jobId_runDate: {
              jobId: job.id,
              runDate,
            },
          },
        })
        if (rerun?.status === AutomationJobRunStatus.SUCCESS || rerun?.status === AutomationJobRunStatus.SKIPPED) {
          results.push({
            ok: rerun.status === AutomationJobRunStatus.SUCCESS,
            jobId: job.id,
            jobName: job.name,
            status: rerun.status,
            message: rerun.message ?? 'Already processed for today.',
            lessonId: rerun.lessonId ?? undefined,
          })
          continue
        }
      }
    } else {
      await prisma.automationJobRun.update({
        where: {
          jobId_runDate: {
            jobId: job.id,
            runDate,
          },
        },
        data: {
          status: AutomationJobRunStatus.PENDING,
          message: 'Automation run restarted.',
          lessonId: null,
        },
      })
    }

    try {
      const themePool = getThemePool(job.themePool)
      const topic = getTopicForDate(referenceDate, themePool)
      const dateLabel = getItalianDate(referenceDate)

      const generated = await generateLessonWithGemini({
        geminiApiKey,
        topic,
        dateLabel,
        customPrompt: job.customPrompt,
      })

      const lesson = await prisma.lesson.create({
        data: {
          title: generated.title,
          type: LessonType.STANDARD,
          teacherId: job.teacherId,
          lesson_preview: generated.lesson_preview,
          assignment_text: generated.assignmentText,
          questions: generated.questions as Prisma.InputJsonValue,
          context_text: topic,
          price: job.price,
          difficulty: job.difficulty,
          isFreeForAll: false,
          notes: `Automation job: ${job.name}`,
        },
      })

      const assignmentResult = await applyAutomationAssignments({
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        teacher: job.teacher,
        assignment: {
          studentIds: [],
          classIds: [job.classId],
          startDate: referenceDate,
          deadline: null,
          notificationOption: 'on_start_date',
          reassignExisting: false,
        },
      })

      if (!assignmentResult.ok) {
        await prisma.lesson.delete({ where: { id: lesson.id } })
        throw new Error(assignmentResult.error)
      }

      const message = `Created "${lesson.title}" for ${topic} and assigned it to ${job.class.name}.`
      await updateRunAndJob({
        jobId: job.id,
        runDate,
        status: AutomationJobRunStatus.SUCCESS,
        message,
        lessonId: lesson.id,
      })

      results.push({
        ok: true,
        jobId: job.id,
        jobName: job.name,
        status: AutomationJobRunStatus.SUCCESS,
        message,
        lessonId: lesson.id,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown automation failure.'
      await updateRunAndJob({
        jobId: job.id,
        runDate,
        status: AutomationJobRunStatus.FAILED,
        message,
      })
      results.push({
        ok: false,
        jobId: job.id,
        jobName: job.name,
        status: AutomationJobRunStatus.FAILED,
        message,
      })
    }
  }

  return results
}
