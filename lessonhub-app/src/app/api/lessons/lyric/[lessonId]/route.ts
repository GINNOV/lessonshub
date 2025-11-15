export const runtime = 'nodejs';

import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { LessonType, Prisma, Role } from "@prisma/client";
import { hasAdminPrivileges } from "@/lib/authz";

type LyricLineInput = {
  id: string;
  text: string;
  startTime: number | null;
  endTime: number | null;
  hiddenWords?: string[];
};

const isNumberLike = (value: unknown): value is number => {
  if (typeof value === 'number' && Number.isFinite(value)) return true;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed);
  }
  return false;
};

const sanitizeLines = (raw: unknown): LyricLineInput[] => {
  if (!Array.isArray(raw)) {
    throw new Error("Lines must be an array.");
  }

  const seenIds = new Set<string>();

  return raw.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`Line ${index + 1} is malformed.`);
    }

    const { id, text, startTime, endTime, hiddenWords } = item as Record<string, unknown>;

    if (!id || typeof id !== 'string') {
      throw new Error(`Line ${index + 1} is missing a valid id.`);
    }

    if (seenIds.has(id)) {
      throw new Error(`Duplicate line id detected: ${id}`);
    }
    seenIds.add(id);

    if (typeof text !== 'string' || text.trim().length === 0) {
      throw new Error(`Line ${index + 1} requires lyric text.`);
    }

    const parsedStart = isNumberLike(startTime) ? Number(startTime) : null;
    const parsedEnd = isNumberLike(endTime) ? Number(endTime) : null;

    if (parsedStart !== null && parsedStart < 0) {
      throw new Error(`Line ${index + 1} startTime cannot be negative.`);
    }
    if (parsedEnd !== null && parsedEnd < 0) {
      throw new Error(`Line ${index + 1} endTime cannot be negative.`);
    }
    if (parsedStart !== null && parsedEnd !== null && parsedEnd < parsedStart) {
      throw new Error(`Line ${index + 1} endTime must be greater than startTime.`);
    }

    if (hiddenWords && !Array.isArray(hiddenWords)) {
      throw new Error(`Line ${index + 1} hiddenWords must be an array of strings.`);
    }

    return {
      id,
      text: text.trim(),
      startTime: parsedStart,
      endTime: parsedEnd,
      hiddenWords: Array.isArray(hiddenWords)
        ? hiddenWords.filter((word): word is string => typeof word === 'string' && word.trim().length > 0)
        : undefined,
    };
  });
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const session = await auth();
  const { lessonId } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        lyricConfig: true,
      },
    });

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found." }, { status: 404 });
    }

    if (lesson.teacherId !== session.user.id && !hasAdminPrivileges(session.user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json(lesson);
  } catch (error) {
    console.error("LYRIC_LESSON_FETCH_ERROR", error);
    return NextResponse.json({ error: "Failed to fetch lyric lesson" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const session = await auth();
  const { lessonId } = await params;

  if (!session?.user?.id || session.user.role !== Role.TEACHER) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const existingLesson = await prisma.lesson.findFirst({
      where: { id: lessonId, teacherId: session.user.id },
      include: { lyricConfig: true },
    });

    if (!existingLesson) {
      return NextResponse.json({ error: "Lesson not found." }, { status: 404 });
    }

    const body = await request.json();
    const {
      title,
      price,
      difficulty,
      lesson_preview,
      assignment_text,
      assignment_image_url,
      soundcloud_url,
      attachment_url,
      notes,
      audioUrl,
      audioStorageKey,
      timingSourceUrl,
      lrcUrl,
      lrcStorageKey,
      rawLyrics,
      lines,
      settings,
    } = body ?? {};

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: "Lesson title is required." }, { status: 400 });
    }

    const cleanedAudioUrl = typeof audioUrl === 'string' ? audioUrl.trim() : '';
    const attachmentTrimmed = typeof attachment_url === 'string' ? attachment_url.trim() : existingLesson.attachment_url?.trim() ?? '';
    const attachmentIsAudioFile = Boolean(
      attachmentTrimmed && /\.(mp3|wav|ogg|m4a|aac)$/i.test(attachmentTrimmed)
    );
    const attachmentIsSpotify = Boolean(
      attachmentTrimmed && /open\.spotify\.com/i.test(attachmentTrimmed)
    );
    const attachmentAllowsAudioBypass = attachmentIsAudioFile || attachmentIsSpotify;

    if (!cleanedAudioUrl && !attachmentAllowsAudioBypass) {
      return NextResponse.json({ error: "Audio URL is required." }, { status: 400 });
    }

    const derivedAudioUrl = cleanedAudioUrl || (attachmentIsAudioFile ? attachmentTrimmed : '');

    if (!rawLyrics || typeof rawLyrics !== 'string' || rawLyrics.trim().length === 0) {
      return NextResponse.json({ error: "Raw lyrics are required." }, { status: 400 });
    }

    const sanitizedLines = sanitizeLines(lines);
    if (sanitizedLines.length === 0) {
      return NextResponse.json({ error: "At least one lyric line is required." }, { status: 400 });
    }

    const difficultyValue = Number(difficulty ?? existingLesson.difficulty ?? 3);
    if (!Number.isInteger(difficultyValue) || difficultyValue < 1 || difficultyValue > 5) {
      return NextResponse.json({ error: "Difficulty must be an integer between 1 and 5." }, { status: 400 });
    }

    const fallbackPrice =
      typeof existingLesson.price === 'object' && existingLesson.price !== null && 'toNumber' in existingLesson.price
        ? (existingLesson.price as Prisma.Decimal).toNumber()
        : Number(existingLesson.price ?? 0);
    const numericPrice = isNumberLike(price) ? Number(price) : fallbackPrice;

    const updatedLesson = await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        title: title.trim(),
        price: numericPrice,
        difficulty: difficultyValue,
        lesson_preview,
        assignment_text,
        assignment_image_url,
        soundcloud_url,
        attachment_url,
        notes,
        type: LessonType.LYRIC,
        lyricConfig: {
          upsert: {
            update: {
              audioUrl: derivedAudioUrl,
              audioStorageKey: cleanedAudioUrl
                ? (typeof audioStorageKey === 'string' ? audioStorageKey : null)
                : null,
              timingSourceUrl:
                typeof timingSourceUrl === 'string' && timingSourceUrl.trim().length > 0
                  ? timingSourceUrl.trim()
                  : null,
              lrcUrl:
                typeof lrcUrl === 'string' && lrcUrl.trim().length > 0
                  ? lrcUrl.trim()
                  : null,
              lrcStorageKey: typeof lrcStorageKey === 'string' ? lrcStorageKey : null,
              rawLyrics: rawLyrics.trim(),
              lines: sanitizedLines as unknown as Prisma.InputJsonValue,
              settings: settings as Prisma.InputJsonValue | undefined,
            },
            create: {
              audioUrl: derivedAudioUrl,
              audioStorageKey: cleanedAudioUrl
                ? (typeof audioStorageKey === 'string' ? audioStorageKey : null)
                : null,
              timingSourceUrl:
                typeof timingSourceUrl === 'string' && timingSourceUrl.trim().length > 0
                  ? timingSourceUrl.trim()
                  : null,
              lrcUrl:
                typeof lrcUrl === 'string' && lrcUrl.trim().length > 0
                  ? lrcUrl.trim()
                  : null,
              lrcStorageKey: typeof lrcStorageKey === 'string' ? lrcStorageKey : null,
              rawLyrics: rawLyrics.trim(),
              lines: sanitizedLines as unknown as Prisma.InputJsonValue,
              settings: settings as Prisma.InputJsonValue | undefined,
            },
          },
        },
      },
      include: {
        lyricConfig: true,
      },
    });

    return NextResponse.json(updatedLesson);
  } catch (error) {
    console.error("LYRIC_LESSON_UPDATE_ERROR", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003' || error.code === 'P2025') {
        return NextResponse.json({ error: 'Unable to update lyric lesson because related records are missing.' }, { status: 400 });
      }
    }
    const message =
      error instanceof Error && error.message?.toLowerCase().includes('lrc')
        ? 'Database schema is out of date. Please run `npm run prisma:migrate` followed by `npm run prisma:generate`, then retry.'
        : 'Failed to update lyric lesson';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
