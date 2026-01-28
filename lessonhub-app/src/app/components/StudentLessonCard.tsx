// file: src/app/components/StudentLessonCard.tsx
'use client';

import { useCallback, useState, type MouseEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AssignmentStatus, LessonType } from '@prisma/client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials, cn, getWeekAndDay } from '@/lib/utils';
import { parseComposerSentence } from '@/lib/composer';
import LocaleDate from '@/app/components/LocaleDate';
import { Button } from '@/components/ui/button';
import { Share2, Users, RotateCw, Store } from 'lucide-react';
import { toast } from 'sonner';
import { ensureLessonShareLink } from '@/actions/lessonActions';
import { LessonDifficultyIndicator } from '@/app/components/LessonDifficultySelector';
import { LESSON_TYPE_SHORT_LABELS } from '@/lib/lessonTypeLabels';

type SerializableUser = {
  id: string;
  name: string | null;
  image: string | null;
  defaultLessonPrice: number | null;
};

type SerializableLesson = {
  id: string;
  title: string;
  type: LessonType;
  lesson_preview: string | null;
  assignment_image_url: string | null;
  price: number;
  isFreeForAll?: boolean;
  guideIsFreeForAll?: boolean;
  public_share_id: string | null;
  submittedCount: number;
  teacher: SerializableUser | null;
  completionCount: number;
  difficulty: number;
  composerConfig?: {
    hiddenSentence: string;
  } | null;
  questionCount?: number;
  multiChoiceCount?: number;
};

type SerializableAssignment = {
  id: string;
  status: AssignmentStatus;
  deadline: Date | string;
  originalDeadline: Date | string | null;
  score: number | null;
  pointsAwarded: number;
  answers: any;
  draftAnswers?: any;
  marketplacePurchased?: boolean;
  lesson: SerializableLesson;
};

interface StudentLessonCardProps {
  assignment: SerializableAssignment;
  index: number;
  copy?: StudentLessonCardCopy;
}

type StudentLessonCardCopy = {
  viewResults: string;
  practiceAgain: string;
  shareLinkLabel: string;
  shareLinkTitle: string;
  viewTeacherTitle: string;
  unassignedTeacher: string;
  unassignedTeacherAlt: string;
  submittedCountTitle: string;
  submittedCountShort: string;
  difficultyLabels: string[];
  difficultySrPrefix: string;
  status: {
    graded: string;
    failed: string;
    submitted: string;
    pastDue: string;
    pending: string;
    gradedScore: string;
  };
  scoreEmpty: string;
  shareLinkError: string;
  shareLinkCopied: string;
  shareLinkReady: string;
  shareLinkCopyError: string;
  dueLabel: string;
  extendedLabel: string;
  originalLabel: string;
};

const defaultCopy: StudentLessonCardCopy = {
  viewResults: 'View Results',
  practiceAgain: 'Practice this lesson again',
  shareLinkLabel: 'Copy lesson share link',
  shareLinkTitle: 'Copy lesson share link',
  viewTeacherTitle: "View {teacher}'s profile",
  unassignedTeacher: 'Unassigned',
  unassignedTeacherAlt: 'Unassigned teacher',
  submittedCountTitle: '{submitted} of {total} students have submitted',
  submittedCountShort: '{submitted} of {total}',
  difficultyLabels: ['Super Simple', 'Approachable', 'Intermediate', 'Challenging', 'Advanced'],
  difficultySrPrefix: 'Lesson difficulty:',
  status: {
    graded: 'Graded',
    failed: 'Failed',
    submitted: 'Submitted',
    pastDue: 'Past Due',
    pending: 'Pending',
    gradedScore: 'Graded: {score}/10',
  },
  scoreEmpty: '—',
  shareLinkError: 'Failed to generate share link.',
  shareLinkCopied: 'Lesson link copied to clipboard.',
  shareLinkReady: 'Lesson link ready to share.',
  shareLinkCopyError: 'Unable to copy share link.',
  dueLabel: 'Due',
  extendedLabel: 'Updated',
  originalLabel: 'Original:',
};
const lessonTypeImages: Record<LessonType, string> = {
    [LessonType.STANDARD]: '/my-lessons/standard.png',
    [LessonType.FLASHCARD]: '/my-lessons/flashcard.png',
    [LessonType.MULTI_CHOICE]: '/my-lessons/multiquestions.png',
    [LessonType.LEARNING_SESSION]: '/my-lessons/learning.png',
    [LessonType.NEWS_ARTICLE]: '/my-lessons/standard.png',
    [LessonType.LYRIC]: '/my-lessons/learning.png',
    [LessonType.COMPOSER]: '/my-lessons/composer.png',
    [LessonType.ARKANING]: '/my-lessons/standard.png',
};

export default function StudentLessonCard({ assignment, index, copy }: StudentLessonCardProps) {
  const t = copy ?? defaultCopy;
  const { lesson, status, deadline, score, pointsAwarded } = assignment;
  const isMarketplacePurchased = Boolean(assignment.marketplacePurchased);
  const currentDeadline = new Date(deadline);
  const originalDeadlineDate = assignment.originalDeadline ? new Date(assignment.originalDeadline) : null;
  const hasExtendedDeadline = !isMarketplacePurchased && Boolean(
    originalDeadlineDate && Math.abs(currentDeadline.getTime() - originalDeadlineDate.getTime()) > 60 * 1000
  );
  const isPastDeadline = currentDeadline < new Date();
  const isComplete = status === AssignmentStatus.COMPLETED || status === AssignmentStatus.GRADED || status === AssignmentStatus.FAILED;
  const [shareId, setShareId] = useState<string | null>(lesson.public_share_id);
  const [isCopying, setIsCopying] = useState(false);
  const pointsEarned = Math.max(pointsAwarded ?? 0, 0);
  const normalizedDifficulty = Math.min(Math.max(Number(lesson.difficulty) || 3, 1), 5);
  const difficultyLabel =
    t.difficultyLabels?.[normalizedDifficulty - 1] ??
    defaultCopy.difficultyLabels[normalizedDifficulty - 1];
  const completionPercent = (() => {
    const draftAnswers = assignment.draftAnswers;
    const hasDraftAnswers = draftAnswers && typeof draftAnswers === 'object';
    if (lesson.type === LessonType.COMPOSER && lesson.composerConfig?.hiddenSentence) {
      const totalWords = parseComposerSentence(lesson.composerConfig.hiddenSentence).words.length;
      const draftAnswerMap =
        hasDraftAnswers && (draftAnswers as { answers?: Record<string, string> }).answers
          ? (draftAnswers as { answers?: Record<string, string> }).answers
          : hasDraftAnswers
            ? (draftAnswers as Record<string, string>)
            : null;
      const answeredCount = draftAnswers
        ? Object.values(draftAnswerMap ?? {}).filter((value) => typeof value === 'string' && value.trim()).length
        : Array.isArray(assignment.answers)
          ? assignment.answers.filter((answer) => (answer as { selectedWord?: string })?.selectedWord?.trim()).length
          : 0;
      return totalWords > 0 ? Math.round((answeredCount / totalWords) * 100) : 0;
    }
    if (lesson.type === LessonType.MULTI_CHOICE && lesson.multiChoiceCount) {
      const total = lesson.multiChoiceCount;
      const answeredCount = hasDraftAnswers
        ? Object.keys(draftAnswers as Record<string, string>).length
        : Array.isArray(assignment.answers)
          ? assignment.answers.length
          : 0;
      return total > 0 ? Math.round((answeredCount / total) * 100) : 0;
    }
    if (lesson.type === LessonType.STANDARD && lesson.questionCount) {
      const total = lesson.questionCount;
      const answeredCount = hasDraftAnswers && Array.isArray(draftAnswers)
        ? draftAnswers.filter((value: unknown) => typeof value === 'string' && value.trim()).length
        : Array.isArray(assignment.answers)
          ? assignment.answers.filter((value: unknown) => {
              if (typeof value === 'string') return value.trim();
              if (value && typeof value === 'object') {
                return Boolean((value as { answer?: string }).answer?.trim());
              }
              return false;
            }).length
          : 0;
      return total > 0 ? Math.round((answeredCount / total) * 100) : 0;
    }
    return lesson.completionCount > 0
      ? Math.round((lesson.submittedCount / lesson.completionCount) * 100)
      : 0;
  })();
  const canPractice =
    (status === AssignmentStatus.GRADED || status === AssignmentStatus.FAILED) &&
    (lesson.type === LessonType.FLASHCARD ||
      lesson.type === LessonType.MULTI_CHOICE ||
      lesson.type === LessonType.STANDARD);
  
  const gradedScore = typeof score === 'number' ? score.toString() : t.scoreEmpty;
  const dueDisplay = isMarketplacePurchased ? 'Anytime' : null;
  const marketplaceStatus =
    isMarketplacePurchased && status === AssignmentStatus.PENDING
      ? {
          label: 'Unlocked',
          className: 'bg-amber-400/20 text-amber-100 border border-amber-300/60',
        }
      : null;
  const statusMeta = (() => {
    if (marketplaceStatus) {
      return marketplaceStatus;
    }
    if (status === AssignmentStatus.GRADED) {
      return {
        label: t.status.gradedScore.replace('{score}', gradedScore),
        className: 'bg-emerald-400/15 text-emerald-100 border border-emerald-300/50',
      };
    }
    if (status === AssignmentStatus.FAILED) {
      return {
        label: t.status.failed,
        className: 'bg-rose-500/15 text-rose-100 border border-rose-400/60',
      };
    }
    if (status === AssignmentStatus.COMPLETED) {
      return {
        label: t.status.submitted,
        className: 'bg-indigo-400/15 text-indigo-100 border border-indigo-300/50',
      };
    }
    if (isPastDeadline) {
      return {
        label: t.status.pastDue,
        className: 'bg-orange-500/15 text-orange-100 border border-orange-400/60 animate-pulse',
      };
    }
    return {
      label: t.status.pending,
      className: 'bg-amber-400/20 text-amber-100 border border-amber-300/60',
    };
  })();

  // Prefer lesson-specific cover when available, otherwise fall back to curated type image
  const coverImage = lesson.assignment_image_url?.trim() || lessonTypeImages[lesson.type];
  const isAnimatedGif = coverImage.toLowerCase().includes('.gif');
  const typeLabel = LESSON_TYPE_SHORT_LABELS[lesson.type] || 'LESSON';

  const lessonIdDisplay = `Lesson ${getWeekAndDay(currentDeadline)}`;
  const showMarketplaceIcon =
    !isMarketplacePurchased &&
    (status === AssignmentStatus.FAILED ||
      (status === AssignmentStatus.PENDING && isPastDeadline));

  const copyToClipboard = async (text: string) => {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);

    const selection = document.getSelection();
    const originalRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

    textarea.select();
    const succeeded = document.execCommand('copy');
    document.body.removeChild(textarea);

    if (originalRange && selection) {
      selection.removeAllRanges();
      selection.addRange(originalRange);
    }

    if (!succeeded) {
      throw new Error('Copy command failed');
    }
  };

  const handleShare = useCallback(async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (isCopying) {
      return;
    }

    setIsCopying(true);
    try {
      let currentShareId = shareId;

      if (!currentShareId) {
        const result = await ensureLessonShareLink(lesson.id);
        if (!result.success || !result.shareId) {
          toast.error(result.error || t.shareLinkError);
          return;
        }
        currentShareId = result.shareId;
        setShareId(currentShareId);
      }

      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const shareUrl = `${origin}/share/lesson/${currentShareId}`;

      let wasShared = false;
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        try {
          await navigator.share({
            title: lesson.title,
            text: lesson.lesson_preview ?? 'Check out this LessonHub assignment.',
            url: shareUrl,
          });
          wasShared = true;
        } catch (error) {
          // If the user cancels the share sheet, fall through to copy.
          if ((error as DOMException)?.name !== 'AbortError') {
            console.warn('System share failed, falling back to copy.', error);
          }
        }
      }

      if (!wasShared) {
        await copyToClipboard(shareUrl);
        toast.success(t.shareLinkCopied);
      } else {
        toast.success(t.shareLinkReady);
      }
    } catch (error) {
      console.error('Failed to copy share link', error);
      toast.error(t.shareLinkCopyError);
    } finally {
      setIsCopying(false);
    }
  }, [shareId, lesson.id, lesson.lesson_preview, lesson.title, isCopying, t]);

  return (
    <Card
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/80 shadow-xl backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(0,0,0,0.35)] animate-in fade-in-0 slide-in-from-bottom-4"
      style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'backwards' }}
    >
      <CardHeader className="p-0">
        <Link href={`/assignments/${assignment.id}`} className="block relative h-44 w-full overflow-hidden">
          <Image
            src={coverImage}
            alt={lesson.title}
            fill
            priority={index < 3 && !isAnimatedGif}
            unoptimized={isAnimatedGif}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 60vw, 480px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-black/40 to-transparent" />
          <div className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
            <span className="text-teal-200/90">{typeLabel}</span>
            <span className="font-mono text-white/80">{lessonIdDisplay}</span>
          </div>
          <div className="absolute right-3 top-3 flex items-center gap-1 text-2xl drop-shadow">
            {isMarketplacePurchased && '🐷'}
            {score !== null && score < 4 && '💩'}
            {score === 10 && '💯'}
          </div>
          <div className="absolute bottom-3 right-3">
            <Badge variant="outline" className={`${statusMeta.className} backdrop-blur-sm`}>
              {statusMeta.label}
            </Badge>
          </div>
        </Link>
      </CardHeader>
      <CardContent className="flex-grow space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-lg font-bold leading-tight text-slate-100">
            <Link href={`/assignments/${assignment.id}`} className="transition-colors hover:text-teal-200">
              {lesson.title}
            </Link>
          </CardTitle>
        </div>
        <p className="text-sm text-slate-400 line-clamp-2">{lesson.lesson_preview}</p>
        <LessonDifficultyIndicator
          value={lesson.difficulty}
          size="sm"
          className="mt-2"
          labels={t.difficultyLabels}
          srLabel={`${t.difficultySrPrefix} ${difficultyLabel}`}
        />
        {!isComplete && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              <span>Completion</span>
              <span className="text-slate-100">{completionPercent}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-400 via-lime-400 to-amber-400"
                style={{ width: `${Math.min(completionPercent, 100)}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-4 border-t border-slate-800/70 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-4 text-slate-200">
          <div
            className="flex items-center gap-2"
            title={
              lesson.teacher?.name
                ? t.viewTeacherTitle.replace('{teacher}', lesson.teacher.name)
                : t.unassignedTeacher
            }
          >
            {lesson.teacher ? (
              <Link href={`/teachers#${lesson.teacher.id}`} className="inline-flex" prefetch={false}>
                <Avatar className="h-7 w-7 ring-2 ring-slate-800">
                  <AvatarImage src={lesson.teacher.image || ''} alt={lesson.teacher.name || 'teacher'} />
                  <AvatarFallback>{getInitials(lesson.teacher.name)}</AvatarFallback>
                </Avatar>
              </Link>
            ) : (
              <Avatar className="h-7 w-7 ring-2 ring-slate-800">
                <AvatarImage src="" alt={t.unassignedTeacherAlt} />
                <AvatarFallback>?</AvatarFallback>
              </Avatar>
            )}
          </div>
          <div
            className="flex items-center gap-1 text-slate-400"
            title={t.submittedCountTitle
              .replace('{submitted}', String(lesson.submittedCount))
              .replace('{total}', String(lesson.completionCount))}
          >
            <Users className="h-4 w-4" />
            <span>
              {t.submittedCountShort
                .replace('{submitted}', String(lesson.submittedCount))
                .replace('{total}', String(lesson.completionCount))}
            </span>
          </div>
          {status === AssignmentStatus.GRADED && (
            <Badge variant="outline" className="border-emerald-300/60 bg-emerald-400/15 text-emerald-100">
              +{pointsEarned} pts
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {showMarketplaceIcon && (
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="h-9 w-9 border border-amber-400/40 bg-amber-500/10 text-amber-100 transition hover:border-amber-300/80 hover:text-white"
              aria-label="Lesson marketplace"
              title="Lesson marketplace"
            >
              <Link href="/marketplace">
                <Store className="h-4 w-4" />
              </Link>
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleShare}
            disabled={isCopying}
            className="h-9 w-9 border border-slate-700 bg-slate-800/70 text-slate-200 transition hover:border-teal-400/60 hover:text-white"
            aria-label={t.shareLinkLabel}
            title={t.shareLinkTitle}
          >
            <Share2 className={cn("h-4 w-4", isCopying && "animate-pulse")} />
          </Button>
          {isComplete ? (
            <div className="flex items-center gap-2">
              {canPractice && (
                <Button
                  asChild
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 border border-slate-700 bg-slate-800/70 text-slate-200 hover:border-teal-400/60 hover:text-white"
                >
                  <Link
                    href={`/assignments/${assignment.id}?practice=1`}
                    aria-label={t.practiceAgain}
                    title={t.practiceAgain}
                  >
                    <RotateCw className="h-4 w-4" />
                  </Link>
                </Button>
              )}
              <Button
                asChild
                variant="secondary"
                size="sm"
                className="border border-teal-300/50 bg-teal-500/20 text-teal-100 hover:bg-teal-400/30"
              >
                <Link href={`/assignments/${assignment.id}?view=results`}>{t.viewResults}</Link>
              </Button>
            </div>
          ) : (
            <div className="text-right">
              <div className="flex flex-col items-end gap-1">
                <div className={cn("flex items-center gap-2 font-semibold text-xs sm:text-sm", isPastDeadline ? "text-orange-300" : "text-slate-200")}>
                  <span>
                    {t.dueLabel}{' '}
                    {dueDisplay ? dueDisplay : <LocaleDate date={deadline} />}
                  </span>
                  {hasExtendedDeadline && (
                    <Badge variant="outline" className="border-cyan-300/60 text-cyan-100">
                      {t.extendedLabel}
                    </Badge>
                  )}
                </div>
                {hasExtendedDeadline && originalDeadlineDate && (
                  <div className="text-[11px] text-slate-400">
                    {t.originalLabel}&nbsp;
                    <span className="line-through">
                      <LocaleDate date={originalDeadlineDate.toISOString()} />
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
