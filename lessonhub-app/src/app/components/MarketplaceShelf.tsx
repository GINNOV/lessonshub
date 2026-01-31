'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { AssignmentStatus, LessonType } from '@prisma/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LessonDifficultyIndicator } from '@/app/components/LessonDifficultySelector';
import { getInitials, cn } from '@/lib/utils';
import { purchaseMarketplaceLesson } from '@/actions/marketplaceActions';
import { toast } from 'sonner';
import { Store, Sparkles, Clock, Search } from 'lucide-react';
import { marketplaceCopy, type MarketplaceLocale } from '@/lib/marketplaceCopy';
import WeekDivider from '@/app/components/WeekDivider';
import { Input } from '@/components/ui/input';

const lessonTypeImages: Record<LessonType, string> = {
  [LessonType.STANDARD]: '/my-lessons/standard.png',
  [LessonType.FLASHCARD]: '/my-lessons/flashcard.png',
  [LessonType.MULTI_CHOICE]: '/my-lessons/multiquestions.png',
  [LessonType.LEARNING_SESSION]: '/my-lessons/learning.png',
  [LessonType.NEWS_ARTICLE]: '/my-lessons/standard.png',
  [LessonType.LYRIC]: '/my-lessons/learning.png',
  [LessonType.COMPOSER]: '/my-lessons/composer.png',
  [LessonType.ARKANING]: '/my-lessons/standard.png',
  [LessonType.FLIPPER]: '/my-lessons/flashcard.png',
};

type MarketplaceLesson = {
  assignmentId: string;
  status: AssignmentStatus;
  deadline: Date | string;
  lesson: {
    id: string;
    title: string;
    type: LessonType;
    lesson_preview: string | null;
    assignment_image_url: string | null;
    price: number;
    difficulty: number;
    teacher: { id: string; name: string | null; image: string | null } | null;
  };
};

export default function MarketplaceShelf({
  lessons,
  availableSavings,
  locale,
}: {
  lessons: MarketplaceLesson[];
  availableSavings: number;
  locale: MarketplaceLocale;
}) {
  const [balance, setBalance] = useState(availableSavings);
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(() => new Set());
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const copy = marketplaceCopy[locale];

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat(locale === 'it' ? 'it-IT' : 'en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(value);

  const visibleLessons = useMemo(() => {
    const term = search.trim().toLowerCase();
    return lessons
      .filter((lesson) => !purchasedIds.has(lesson.assignmentId))
      .filter((lesson) => {
        if (!term) return true;
        const title = lesson.lesson.title?.toLowerCase() || '';
        const teacher = lesson.lesson.teacher?.name?.toLowerCase() || '';
        return title.includes(term) || teacher.includes(term);
      });
  }, [lessons, purchasedIds, search]);

  const getWeekKey = (date: Date) => {
    const tempDate = new Date(date.valueOf());
    tempDate.setUTCDate(tempDate.getUTCDate() + 4 - (tempDate.getUTCDay() || 7));
    const year = tempDate.getUTCFullYear();
    const yearStart = new Date(Date.UTC(year, 0, 1));
    const weekNo = Math.ceil((((tempDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return { year, weekNo, key: `${year}-${weekNo}` };
  };

  const handlePurchase = async (lesson: MarketplaceLesson) => {
    if (pendingId) return;
    setPendingId(lesson.assignmentId);
    try {
      const result = await purchaseMarketplaceLesson(lesson.assignmentId);
      if (!result.success) {
        toast.error(result.error || 'Unable to purchase this lesson.');
        return;
      }
      setPurchasedIds((prev) => {
        const next = new Set(prev);
        next.add(lesson.assignmentId);
        return next;
      });
      setBalance((prev) => Math.max(0, prev - lesson.lesson.price));
      toast.success('Lesson unlocked! It is yours forever.');
    } catch (error) {
      console.error('Marketplace purchase failed', error);
      toast.error('Unable to purchase this lesson.');
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div
      className="relative min-h-screen bg-[radial-gradient(circle_at_top,#ffe8c7_0%,#fff5e7_40%,#fff9f1_70%)] px-4 pb-20 pt-16 text-amber-900"
      style={{
        ['--market-cream' as string]: '#FFF4E8',
        ['--market-sand' as string]: '#FCE6CB',
        ['--market-rose' as string]: '#F8D6C5',
        ['--market-ink' as string]: '#4E2C1E',
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,#ffffffb3_0%,#ffffff00_60%),linear-gradient(180deg,#ffffffb3_0%,#ffffff00_22%,#f1c18a66_75%,#e2a96f99_100%)] opacity-80" />
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-10 flex flex-col gap-6 rounded-[32px] border-2 border-amber-200/80 bg-[var(--market-cream)] p-8 shadow-[0_30px_70px_rgba(152,87,35,0.18)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                <Store className="h-4 w-4" />
                LessonHub Marketplace
              </div>
              <h1 className="mt-4 font-serif text-4xl font-bold text-[var(--market-ink)] md:text-5xl">
                {copy.title}
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-amber-800/80 md:text-base">
                {copy.subtitle}
              </p>
            </div>
            <div className="rounded-2xl border-2 border-amber-300/70 bg-white/80 px-6 py-4 text-right shadow-inner">
              <p className="text-xs uppercase tracking-[0.25em] text-amber-600">{copy.balanceLabel}</p>
              <p className="mt-2 text-3xl font-black text-amber-900">{formatCurrency(balance)}</p>
              <p className="mt-1 text-xs text-amber-700/80">{copy.balanceNote}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-amber-700">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white/70 px-3 py-1 font-semibold">
              <Sparkles className="h-4 w-4" />
              {copy.badgeForever}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white/70 px-3 py-1 font-semibold">
              <Clock className="h-4 w-4" />
              {copy.badgeRetake}
            </span>
          </div>
        </div>

        {copy.balanceNote ? (
          <div className="mb-6 text-right text-xs text-amber-700/80">{copy.balanceNote}</div>
        ) : null}

        <div className="mb-8 rounded-[24px] border border-amber-200/80 bg-white/70 p-4 shadow-[0_12px_28px_rgba(165,90,30,0.15)]">
          <div className="relative w-full md:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-400" aria-hidden="true" />
            <Input
              type="search"
              placeholder={locale === 'it' ? 'Cerca per titolo o insegnante…' : 'Search by title or teacher...'}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-2xl border border-amber-200 bg-white/80 pl-10 text-amber-900 placeholder:text-amber-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/40"
            />
          </div>
        </div>

        {visibleLessons.length === 0 ? (
          <div className="rounded-[28px] border-2 border-dashed border-amber-200 bg-white/70 p-10 text-center text-amber-700 shadow-inner">
            <p className="text-lg font-semibold">{copy.emptyTitle}</p>
            <p className="mt-2 text-sm text-amber-800/70">
              {copy.emptyBody}
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {(() => {
              const groups = new Map<
                string,
                { key: string; weekNo: number; year: number; items: MarketplaceLesson[] }
              >();
              visibleLessons.forEach((lesson) => {
                const { key, weekNo, year } = getWeekKey(new Date(lesson.deadline));
                if (!groups.has(key)) {
                  groups.set(key, { key, weekNo, year, items: [] });
                }
                groups.get(key)!.items.push(lesson);
              });
              const orderedWeeks = Array.from(groups.values()).sort((a, b) => {
                if (a.year !== b.year) return b.year - a.year;
                return b.weekNo - a.weekNo;
              });
              let cardIndex = 0;
              return (
                <div className="space-y-4">
                  {orderedWeeks.map((group, idx) => (
                    <div
                      key={group.key}
                      className="rounded-[24px] border border-amber-200/70 bg-white/60 shadow-[0_16px_40px_rgba(165,90,30,0.18)]"
                    >
                      <details className="group" open={idx < 1}>
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-6 py-4 text-amber-800">
                          <WeekDivider
                            weekNumber={group.weekNo}
                            year={group.year}
                            dividerClassName="bg-amber-200"
                            labelClassName="border-amber-300 bg-amber-50/90 text-amber-950 font-black tracking-[0.12em]"
                          />
                          <span className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                            {group.items.length} lessons
                          </span>
                        </summary>
                        <div className="px-6 pb-6 pt-2">
                          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            {group.items.map((lesson) => {
                              const coverImage =
                                lesson.lesson.assignment_image_url?.trim() || lessonTypeImages[lesson.lesson.type];
                              const isAnimatedGif = coverImage.toLowerCase().includes('.gif');
                              const canAfford = balance >= lesson.lesson.price;
                              const isPending = pendingId === lesson.assignmentId;
                              const statusLabel =
                                lesson.status === AssignmentStatus.FAILED ? copy.statusFailed : copy.statusPastDue;
                              const index = cardIndex++;

                              return (
                                <div
                                  key={lesson.assignmentId}
                                  className="group relative overflow-hidden rounded-[28px] border-2 border-amber-200/80 bg-[linear-gradient(140deg,var(--market-cream),var(--market-sand))] p-6 shadow-[0_20px_60px_rgba(165,90,30,0.18)] transition duration-300 hover:-translate-y-1"
                                  style={{
                                    animationDelay: `${index * 80}ms`,
                                    animationFillMode: 'backwards',
                                  }}
                                >
                                  <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-rose-200/70 blur-2xl" />
                                  <div className="pointer-events-none absolute bottom-0 left-0 h-32 w-32 rounded-full bg-amber-200/60 blur-3xl" />

                                  <div className="relative flex flex-col gap-5">
                                    <div className="flex items-start justify-between gap-4">
                                      <div>
                                        <Badge className="border-amber-200 bg-white/80 text-amber-700">{statusLabel}</Badge>
                                        <h2 className="mt-3 font-serif text-2xl font-semibold text-[var(--market-ink)]">
                                          {lesson.lesson.title}
                                        </h2>
                                      </div>
                                      <div className="relative h-20 w-20 overflow-hidden rounded-2xl border border-amber-200 bg-white/70">
                                        <Image
                                          src={coverImage}
                                          alt={lesson.lesson.title}
                                          fill
                                          sizes="80px"
                                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                                          priority={index < 2 && !isAnimatedGif}
                                          unoptimized={isAnimatedGif}
                                        />
                                      </div>
                                    </div>

                                    <p className="text-sm text-amber-900/70 line-clamp-3">
                                      {lesson.lesson.lesson_preview || 'No preview available.'}
                                    </p>

                                    <LessonDifficultyIndicator
                                      value={lesson.lesson.difficulty}
                                      size="sm"
                                      className="max-w-[220px]"
                                    />

                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                      <div className="flex items-center gap-2">
                                        {lesson.lesson.teacher ? (
                                          <div className="flex items-center gap-2" title={lesson.lesson.teacher.name || 'Teacher'}>
                                            <Avatar className="h-7 w-7 border border-amber-200">
                                              <AvatarImage src={lesson.lesson.teacher.image || ''} />
                                              <AvatarFallback>{getInitials(lesson.lesson.teacher.name)}</AvatarFallback>
                                            </Avatar>
                                            <span className="text-xs font-semibold text-amber-700">
                                              {lesson.lesson.teacher.name || 'Teacher'}
                                            </span>
                                          </div>
                                        ) : (
                                          <span className="text-xs text-amber-700/70">Unassigned</span>
                                        )}
                                      </div>
                                      <div className="rounded-full border border-amber-300 bg-white/80 px-3 py-1 text-sm font-bold text-amber-900">
                                        {lesson.lesson.price > 0 ? formatCurrency(lesson.lesson.price) : copy.priceFree}
                                      </div>
                                    </div>

                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                      <div className="text-xs text-amber-700/80">
                                        {copy.afterPurchase}{' '}
                                        <span className="font-semibold text-amber-800">{copy.afterPurchaseEmphasis}</span>
                                      </div>
                                      <Button
                                        type="button"
                                        onClick={() => handlePurchase(lesson)}
                                        disabled={!canAfford || isPending}
                                        className={cn(
                                          'rounded-full border-2 px-6 py-2 text-sm font-semibold shadow-lg transition',
                                          canAfford
                                            ? 'border-amber-500 bg-amber-500 text-white hover:bg-amber-600'
                                            : 'border-amber-200 bg-amber-100 text-amber-400 cursor-not-allowed',
                                        )}
                                      >
                                        {isPending ? copy.buyCtaBusy : copy.buyCta}
                                      </Button>
                                    </div>
                                    {!canAfford && (
                                      <p className="text-xs text-rose-500">
                                        {copy.needMore(formatCurrency(lesson.lesson.price - balance))}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </details>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
