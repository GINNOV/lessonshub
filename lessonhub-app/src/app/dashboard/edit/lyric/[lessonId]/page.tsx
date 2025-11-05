import { randomUUID } from "node:crypto";
import LyricLessonEditor, { LyricLine, LyricLessonSettings } from "@/app/components/LyricLessonEditor";
import { getLessonById } from "@/actions/lessonActions";
import { getTeacherPreferences } from "@/actions/teacherActions";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { LessonType, Role } from "@prisma/client";

const normalizeLines = (value: unknown): LyricLine[] => {
  if (!Array.isArray(value)) return [];
  const normalized: LyricLine[] = [];
  value.forEach((item) => {
    if (!item || typeof item !== 'object') return;
    const record = item as Record<string, unknown>;
    const text = typeof record.text === 'string' ? record.text : '';
    if (!text.trim()) return;
    const id = typeof record.id === 'string' ? record.id : randomUUID();
    const startTimeValue =
      typeof record.startTime === 'number'
        ? record.startTime
        : typeof record.startTime === 'string' && record.startTime.trim()
        ? Number(record.startTime)
        : null;
    const endTimeValue =
      typeof record.endTime === 'number'
        ? record.endTime
        : typeof record.endTime === 'string' && record.endTime.trim()
        ? Number(record.endTime)
        : null;
    const hiddenWords = Array.isArray(record.hiddenWords)
      ? record.hiddenWords.filter((word): word is string => typeof word === 'string' && word.trim().length > 0)
      : undefined;

    normalized.push({
      id,
      text,
      startTime: Number.isFinite(startTimeValue) ? Number(startTimeValue) : null,
      endTime: Number.isFinite(endTimeValue) ? Number(endTimeValue) : null,
      hiddenWords,
    });
  });
  return normalized;
};

export default async function EditLyricLessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const session = await auth();

  if (!session || (session.user.role !== Role.TEACHER && session.user.role !== Role.ADMIN)) {
    redirect("/");
  }

  const { lessonId } = await params;
  const lesson = await getLessonById(lessonId);

  if (!lesson || lesson.type !== LessonType.LYRIC) {
    redirect("/dashboard");
  }

  if (lesson.teacherId && lesson.teacherId !== session.user.id && session.user.role !== Role.ADMIN) {
    redirect("/dashboard");
  }

  const preferences = await getTeacherPreferences();
  const serializablePreferences = preferences
    ? {
        ...preferences,
        defaultLessonPrice: preferences.defaultLessonPrice?.toNumber() ?? 0,
      }
    : null;

  const serializableLesson = {
    ...lesson,
    price: lesson.price.toNumber(),
    lyricConfig: lesson.lyricConfig
      ? {
          ...lesson.lyricConfig,
          lines: normalizeLines(lesson.lyricConfig.lines),
          settings: (lesson.lyricConfig.settings as LyricLessonSettings | null) ?? null,
        }
      : null,
  };

  return (
    <div className="flex min-h-screen flex-col items-center p-8 sm:p-16">
      <div className="w-full max-w-4xl space-y-6">
        <h1 className="text-3xl font-bold">Edit Lyric Lesson</h1>
        <LyricLessonEditor lesson={serializableLesson} teacherPreferences={serializablePreferences} />
      </div>
    </div>
  );
}
