// file: scripts/backfillMultiChoiceAnswers.ts
import { LessonType, Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const hasFlag = (flag: string) => process.argv.includes(`--${flag}`);
const getArgValue = (name: string) => {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return undefined;
  return process.argv[index + 1];
};

type MultiChoiceAnswerRecord = {
  questionId?: string | null;
  selectedAnswerId?: string | null;
  selectedAnswerText?: string | null;
  selectedAnswerIndex?: number | null;
  isCorrect?: boolean | null;
  [key: string]: unknown;
};

const resolveSelectedOption = (
  question: { options: Array<{ id: string; text: string }> },
  answer: MultiChoiceAnswerRecord
) => {
  const selectedId = answer.selectedAnswerId;
  if (selectedId) {
    const byId = question.options.find(option => option.id === String(selectedId));
    if (byId) {
      return { option: byId, index: question.options.indexOf(byId) };
    }
  }

  if (typeof answer.selectedAnswerIndex === 'number' && Number.isFinite(answer.selectedAnswerIndex)) {
    const zeroBased = question.options[answer.selectedAnswerIndex];
    if (zeroBased) {
      return { option: zeroBased, index: answer.selectedAnswerIndex };
    }
    const oneBased = question.options[answer.selectedAnswerIndex - 1];
    if (oneBased) {
      return { option: oneBased, index: answer.selectedAnswerIndex - 1 };
    }
  }

  if (typeof answer.selectedAnswerText === 'string' && answer.selectedAnswerText.trim()) {
    const byText = question.options.find(option => option.text === answer.selectedAnswerText);
    if (byText) {
      return { option: byText, index: question.options.indexOf(byText) };
    }
  }

  return null;
};

async function main() {
  const apply = hasFlag('apply');
  const lessonId = getArgValue('lesson');
  const assignmentId = getArgValue('assignment');
  const limitRaw = getArgValue('limit');
  const limit = limitRaw ? Number(limitRaw) : undefined;

  console.log('🔎 Multi-choice answer backfill');
  console.log(`Mode: ${apply ? 'apply' : 'dry-run'}`);
  if (lessonId) console.log(`Lesson filter: ${lessonId}`);
  if (assignmentId) console.log(`Assignment filter: ${assignmentId}`);
  if (limit) console.log(`Limit: ${limit}`);

  const assignments = await prisma.assignment.findMany({
    where: {
      ...(assignmentId ? { id: assignmentId } : {}),
      ...(lessonId ? { lessonId } : {}),
      answers: { not: Prisma.JsonNull },
      lesson: { type: LessonType.MULTI_CHOICE },
    },
    include: {
      lesson: {
        include: {
          multiChoiceQuestions: {
            include: { options: true },
          },
        },
      },
    },
    take: limit,
  });

  if (assignments.length === 0) {
    console.log('✅ No assignments found to update.');
    return;
  }

  let touched = 0;
  for (const assignment of assignments) {
    const rawAnswers = assignment.answers;
    if (!Array.isArray(rawAnswers)) continue;

    const questionMap = new Map(
      assignment.lesson.multiChoiceQuestions.map(question => [question.id, question])
    );

    let updated = false;
    const updatedAnswers = rawAnswers.map((entry) => {
      if (!entry || typeof entry !== 'object') return entry;
      const record = entry as MultiChoiceAnswerRecord;
      const questionId = record.questionId;
      if (!questionId || !questionMap.has(questionId)) return entry;

      const question = questionMap.get(questionId)!;
      const resolved = resolveSelectedOption(question, record);
      if (!resolved) return entry;

      if (record.selectedAnswerText && record.selectedAnswerIndex !== null && record.selectedAnswerIndex !== undefined) {
        return entry;
      }

      const next: MultiChoiceAnswerRecord = { ...record };
      if (!record.selectedAnswerText) {
        next.selectedAnswerText = resolved.option.text;
        updated = true;
      }
      if (record.selectedAnswerIndex === null || record.selectedAnswerIndex === undefined) {
        next.selectedAnswerIndex = resolved.index;
        updated = true;
      }
      return next;
    });

    if (!updated) continue;

    touched += 1;
    if (apply) {
      await prisma.assignment.update({
        where: { id: assignment.id },
        data: { answers: updatedAnswers as Prisma.InputJsonValue },
      });
      console.log(`✅ Updated assignment ${assignment.id}`);
    } else {
      console.log(`🟡 Would update assignment ${assignment.id}`);
    }
  }

  console.log(`Done. ${touched} assignment(s) ${apply ? 'updated' : 'matched'}.`);
}

main()
  .catch((error) => {
    console.error('❌ Backfill failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
