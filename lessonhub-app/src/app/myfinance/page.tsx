import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import prisma from '@/lib/prisma';
import { AssignmentStatus, LessonType, PointReason, Role } from '@prisma/client';
import { convertExtraPointsToEuro } from '@/lib/points';
import { getComposerExtraTries } from '@/lib/composer';
import { EXTENSION_POINT_COST, isExtendedDeadline } from '@/lib/lessonExtensions';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ArrowDownRight,
  ArrowUpRight,
  Award,
  BookOpenCheck,
  CalendarClock,
  FileText,
  Medal,
  Newspaper,
  Swords,
} from 'lucide-react';
import { parseAcceptLanguage, resolveLocale, UiLanguagePreference } from '@/lib/locale';
import { getInitials } from '@/lib/utils';

const getCurrencyFormatter = (locale: string) =>
  new Intl.NumberFormat(locale === 'it' ? 'it-IT' : 'en-US', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default async function MyFinancePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session) {
    redirect('/signin');
  }
  if (session.user.role !== Role.STUDENT && session.user.role !== Role.TEACHER) {
    redirect('/dashboard');
  }
  const headerList = await headers();
  const detectedLocales = parseAcceptLanguage(headerList.get('accept-language'));
  const preference = ((session.user as any)?.uiLanguage as UiLanguagePreference) ?? 'device';
  const locale = resolveLocale({
    preference,
    detectedLocales,
    supportedLocales: ['en', 'it'],
    fallback: 'en',
  });
  const formatCurrency = (value: number) => getCurrencyFormatter(locale).format(value);
  const formatSigned = (value: number) =>
    value === 0 ? formatCurrency(0) : `${value > 0 ? '+' : '-'}${formatCurrency(Math.abs(value))}`;

  const query = searchParams ? await searchParams : {};
  const requestedStudentIdRaw = query?.studentId;
  const requestedStudentId = Array.isArray(requestedStudentIdRaw)
    ? requestedStudentIdRaw[0]
    : requestedStudentIdRaw;
  const isTeacherView = session.user.role === Role.TEACHER && Boolean(requestedStudentId);

  let studentId = session.user.id;
  if (isTeacherView && requestedStudentId) {
    const relation = await prisma.teachersForStudent.findFirst({
      where: { teacherId: session.user.id, studentId: requestedStudentId },
      select: { studentId: true },
    });
    if (!relation) {
      redirect('/dashboard');
    }
    studentId = requestedStudentId;
  }
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { id: true, name: true, totalPoints: true, image: true },
  });

  if (!student) {
    redirect('/dashboard');
  }

  const assignments = await prisma.assignment.findMany({
    where: {
      studentId,
      status: { in: [AssignmentStatus.PENDING, AssignmentStatus.COMPLETED, AssignmentStatus.GRADED, AssignmentStatus.FAILED] },
    },
    select: {
      id: true,
      status: true,
      score: true,
      extraPoints: true,
      deadline: true,
      originalDeadline: true,
      answers: true,
      lesson: {
        select: {
          title: true,
          price: true,
          type: true,
          composerConfig: { select: { maxTries: true } },
        },
      },
    },
  });

  const [goldStarSum, arkaningSum, newsArticleSum, marketplaceSum, goldStarsList] = await Promise.all([
    prisma.goldStar.aggregate({
      where: { studentId },
      _sum: { amountEuro: true },
      _count: { id: true },
    }),
    prisma.pointTransaction.aggregate({
      where: { userId: studentId, reason: PointReason.ARKANING_GAME },
      _sum: { amountEuro: true },
    }),
    prisma.pointTransaction.aggregate({
      where: { userId: studentId, reason: PointReason.NEWS_ARTICLE_TAP },
      _sum: { amountEuro: true },
    }),
    prisma.pointTransaction.aggregate({
      where: { userId: studentId, reason: PointReason.MARKETPLACE_PURCHASE },
      _sum: { amountEuro: true },
    }),
    prisma.goldStar.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true,
        message: true,
        amountEuro: true,
        createdAt: true,
        teacher: { select: { name: true } },
      },
    }),
  ]);

  let gradedAdd = 0;
  let failedDeduct = 0;
  let extraPointsAdd = 0;
  let composerPenalty = 0;
  let extensionSpend = 0;
  let extensionCount = 0;

  const extensionItems: Array<{ id: string; title: string }> = [];
  const failedItems: Array<{ id: string; title: string; amount: number; score: number | null }> = [];

  assignments.forEach((assignment) => {
    const price = assignment.lesson?.price ? Number(assignment.lesson.price.toString()) : 0;

    if (assignment.status === AssignmentStatus.GRADED && assignment.score !== null && assignment.score >= 0) {
      gradedAdd += price;
    }

    if (assignment.status === AssignmentStatus.GRADED && assignment.extraPoints) {
      extraPointsAdd += convertExtraPointsToEuro(assignment.extraPoints);
    }

    if (assignment.status === AssignmentStatus.FAILED) {
      failedDeduct += price;
      if (price) {
        failedItems.push({
          id: assignment.id,
          title: assignment.lesson?.title ?? 'Untitled lesson',
          amount: price,
          score: assignment.score ?? null,
        });
      }
    }

    if (
      assignment.lesson?.type === LessonType.COMPOSER &&
      (assignment.status === AssignmentStatus.GRADED || assignment.status === AssignmentStatus.FAILED)
    ) {
      const extraTries = getComposerExtraTries(assignment.answers, assignment.lesson.composerConfig?.maxTries ?? 1);
      const penalty = extraTries * 50;
      if (penalty > 0) {
        composerPenalty += penalty;
      }
    }

    if (isExtendedDeadline(assignment.deadline, assignment.originalDeadline)) {
      extensionSpend += EXTENSION_POINT_COST;
      extensionCount += 1;
      extensionItems.push({
        id: assignment.id,
        title: assignment.lesson?.title ?? 'Untitled lesson',
      });
    }
  });

  const goldStars = Number(goldStarSum._sum.amountEuro ?? 0);
  const goldStarCount = goldStarSum._count.id;
  const arkaning = Number(arkaningSum._sum.amountEuro ?? 0);
  const newsArticle = Number(newsArticleSum._sum.amountEuro ?? 0);
  const marketplace = Number(marketplaceSum._sum.amountEuro ?? 0);

  const savings =
    gradedAdd +
    extraPointsAdd -
    failedDeduct -
    composerPenalty -
    extensionSpend +
    goldStars +
    arkaning +
    newsArticle +
    marketplace;

  const topExtensions = extensionItems.slice(0, 5);
  const topFailures = failedItems.sort((a, b) => b.amount - a.amount).slice(0, 5);

  const biggestDrag = (() => {
    const penaltyPairs: Array<{ key: string; amount: number }> = [
      { key: 'extensions', amount: extensionSpend },
      { key: 'failed lessons', amount: failedDeduct },
      { key: 'composer extra tries', amount: composerPenalty },
      { key: 'arkaning', amount: Math.abs(arkaning) },
      { key: 'marketplace purchases', amount: Math.abs(marketplace) },
    ];
    const sorted = penaltyPairs.sort((a, b) => b.amount - a.amount);
    return sorted[0]?.amount ? sorted[0].key : null;
  })();

  const summaryLine = (() => {
    if (savings >= 0) {
      return locale === 'it'
        ? 'Ottimo lavoro — i tuoi risparmi sono positivi grazie a lezioni valutate e bonus.'
        : 'Nice work — your savings are positive thanks to steady graded lessons and bonuses.';
    }
    if (biggestDrag === 'extensions') {
      return locale === 'it'
        ? 'I risparmi sono negativi soprattutto per via delle estensioni delle scadenze.'
        : 'Your savings are negative mostly because deadline extensions added large deductions.';
    }
    if (biggestDrag === 'failed lessons') {
      return locale === 'it'
        ? 'I risparmi sono negativi soprattutto perché le lezioni fallite superano quelle valutate.'
        : 'Your savings are negative mostly due to failed lessons outweighing graded wins.';
    }
    if (biggestDrag === 'composer extra tries') {
      return locale === 'it'
        ? 'I tentativi extra nei composer sono la principale causa del calo.'
        : 'Extra tries in composer lessons are the largest drag right now.';
    }
    return locale === 'it'
      ? 'I risparmi sono negativi perché le penalità superano il valore guadagnato.'
      : 'Your savings are negative due to penalties outweighing lesson value earned.';
  })();

  const recommendation = (() => {
    if (extensionCount >= 2) {
      return locale === 'it'
        ? 'Prova a chiedere meno estensioni questa settimana: consegnare in tempo è il modo più veloce per risalire.'
        : 'Try requesting fewer extensions this week — finishing on time is the fastest way to lift savings.';
    }
    if (failedDeduct > gradedAdd) {
      return locale === 'it'
        ? 'Concentrati su una lezione alla volta e punta a superarla prima di passare oltre.'
        : 'Focus on one lesson at a time and aim for passing scores before moving on.';
    }
    if (composerPenalty > 0) {
      return locale === 'it'
        ? 'Consiglio composer: vai più lentamente e usa gli indizi per evitare penalità sui tentativi.'
        : 'Composer tip: slow down and use the hint flow to avoid extra-try penalties.';
    }
    return locale === 'it'
      ? 'Mantieni il ritmo: un paio di lezioni valutate possono riportarti in positivo.'
      : 'Keep the momentum: a couple of graded lessons will push this into positive savings.';
  })();

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
      <section className="rounded-3xl border border-emerald-400/25 shadow-[0_0_0_1px_rgba(16,185,129,0.25)] bg-slate-950/80 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarImage src={student.image ?? ''} alt={student.name ?? 'Student'} />
              <AvatarFallback className="bg-slate-800 text-lg font-bold text-slate-100">
                {getInitials(student.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">
                {locale === 'it' ? 'Finanze Studente' : 'Student Finance'}
                {isTeacherView ? ` · ${locale === 'it' ? 'Vista insegnante' : 'Teacher view'}` : ''}
              </p>
              <h1 className="text-2xl font-semibold text-slate-100">{student.name ?? 'Student'}</h1>
              <p className="text-sm text-slate-400">
                {locale === 'it' ? 'Punti totali:' : 'Total points:'} {student.totalPoints?.toLocaleString() ?? 0}
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-emerald-400/25 shadow-[0_0_0_1px_rgba(16,185,129,0.2)] bg-gradient-to-br from-slate-900 via-slate-950 to-black p-5 text-right">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              {locale === 'it' ? 'Risparmi netti' : 'Current Net Savings'}
            </p>
            <div className="flex items-center justify-end gap-2">
              {savings >= 0 ? (
                <ArrowUpRight className="h-5 w-5 text-emerald-300" />
              ) : (
                <ArrowDownRight className="h-5 w-5 text-rose-300" />
              )}
              <p className={`text-3xl font-bold ${savings >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                {formatSigned(savings)}
              </p>
            </div>
            <p className="mt-2 text-sm text-slate-400">{summaryLine}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-3xl border border-emerald-400/25 shadow-[0_0_0_1px_rgba(16,185,129,0.2)] bg-slate-950/80 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100">
              {locale === 'it' ? 'Dettaglio risparmi' : 'Savings Breakdown'}
            </h2>
            <Badge variant="outline" className="border-slate-700 text-slate-200">Real-time</Badge>
          </div>
          <div className="grid gap-4">
            {[
              {
                label: locale === 'it' ? 'Lezioni valutate' : 'Graded lessons',
                helper: locale === 'it' ? 'Compiti completati' : 'Completed coursework',
                value: gradedAdd,
                icon: BookOpenCheck,
                tone: 'text-emerald-300',
                iconTone: 'text-emerald-300',
              },
              {
                label: locale === 'it' ? 'Punti extra' : 'Extra points',
                helper: locale === 'it' ? 'Bonus attività' : 'Bonus activity credits',
                value: extraPointsAdd,
                icon: Medal,
                tone: 'text-emerald-300',
                iconTone: 'text-emerald-300',
              },
              {
                label: locale === 'it' ? 'Gold Star' : 'Gold Stars',
                helper: locale === 'it'
                  ? `${goldStarCount} premio${goldStarCount === 1 ? '' : 'i'}`
                  : `${goldStarCount} award${goldStarCount === 1 ? '' : 's'}`,
                value: goldStars,
                icon: Award,
                tone: 'text-emerald-300',
                iconTone: 'text-amber-300',
              },
              {
                label: locale === 'it' ? 'News taps' : 'News taps',
                helper: locale === 'it' ? 'Letture quotidiane' : 'Reading streaks',
                value: newsArticle,
                icon: Newspaper,
                tone: 'text-slate-300',
                iconTone: 'text-sky-300',
              },
              {
                label: locale === 'it' ? 'Tentativi extra (Composer)' : 'Composer extra tries',
                helper: locale === 'it' ? 'Tentativi aggiuntivi' : 'Puzzle retries',
                value: -composerPenalty,
                icon: FileText,
                tone: 'text-rose-300',
                iconTone: 'text-rose-300',
              },
              {
                label: 'ArkanING',
                helper: locale === 'it' ? 'Risultati del gioco' : 'Game results',
                value: arkaning,
                icon: Swords,
                tone: arkaning >= 0 ? 'text-emerald-300' : 'text-rose-300',
                iconTone: arkaning >= 0 ? 'text-emerald-300' : 'text-rose-300',
              },
              {
                label: locale === 'it' ? 'Lezioni fallite' : 'Failed lessons',
                helper: locale === 'it' ? 'Sotto la sufficienza' : 'Below passing grade',
                value: -failedDeduct,
                icon: ArrowDownRight,
                tone: 'text-rose-300',
                iconTone: 'text-rose-300',
              },
              {
                label: locale === 'it' ? 'Estensioni' : 'Extensions',
                helper: locale === 'it'
                  ? `${extensionCount} richiesta${extensionCount === 1 ? '' : 'e'}`
                  : `${extensionCount} request${extensionCount === 1 ? '' : 's'}`,
                value: -extensionSpend,
                icon: CalendarClock,
                tone: 'text-rose-300',
                iconTone: 'text-rose-300',
              },
            ].map((row, index) => {
              const Icon = row.icon;
              const rowBg =
                index % 2 === 0
                  ? 'bg-gradient-to-r from-emerald-500/10 via-slate-900/60 to-slate-950/80'
                  : 'bg-gradient-to-r from-slate-900/50 via-emerald-500/5 to-slate-950/70';
              return (
                <div
                  key={row.label}
                  className={`flex items-center justify-between rounded-2xl border border-slate-800/70 px-4 py-3 ${rowBg}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-900/80">
                      <Icon className={`h-4 w-4 ${row.iconTone ?? 'text-slate-200'}`} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-100">{row.label}</p>
                      <p className="text-xs text-slate-400">{row.helper}</p>
                    </div>
                  </div>
                  <p className={`text-sm font-semibold ${row.value >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {formatSigned(row.value)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-emerald-400/20 shadow-[0_0_0_1px_rgba(16,185,129,0.15)] bg-slate-950/80 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              {locale === 'it' ? 'Penalità estensioni' : 'Extension penalties'}
            </h3>
            <div className="mt-4 space-y-3">
              {topExtensions.length === 0 ? (
                <p className="text-sm text-slate-400">
                  {locale === 'it' ? 'Nessuna estensione recente.' : 'No extensions used recently.'}
                </p>
              ) : (
                topExtensions.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm text-slate-200">
                    <span className="line-clamp-1">{item.title}</span>
                    <span className="text-rose-300">-{formatCurrency(EXTENSION_POINT_COST)}</span>
                  </div>
                ))
              )}
            </div>
            <div className="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-200">
              {locale === 'it' ? 'Impatto estensioni:' : 'Total extension impact:'} -{formatCurrency(extensionSpend)}
            </div>
          </div>

          <div className="rounded-3xl border border-emerald-400/20 shadow-[0_0_0_1px_rgba(16,185,129,0.15)] bg-slate-950/80 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              {locale === 'it' ? 'Detrazioni per fallimenti' : 'Failed deductions'}
            </h3>
            <div className="mt-4 space-y-3">
              {topFailures.length === 0 ? (
                <p className="text-sm text-slate-400">
                  {locale === 'it' ? 'Nessuna lezione fallita.' : 'No failed lessons yet.'}
                </p>
              ) : (
                topFailures.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm text-slate-200">
                    <div className="min-w-0">
                      <p className="line-clamp-1">{item.title}</p>
                      <p className="text-xs text-slate-500">
                        {locale === 'it' ? 'Voto' : 'Score'}: {item.score ?? (locale === 'it' ? 'N/D' : 'N/A')}
                      </p>
                    </div>
                    <span className="text-rose-300">-{formatCurrency(item.amount)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-emerald-400/20 shadow-[0_0_0_1px_rgba(16,185,129,0.15)] bg-slate-950/80 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              {locale === 'it' ? 'Gold Star ricevute' : 'Gold Stars received'}
            </h3>
            <div className="mt-4 space-y-3">
              {goldStarsList.length === 0 ? (
                <p className="text-sm text-slate-400">
                  {locale === 'it' ? 'Nessuna Gold Star ancora.' : 'No Gold Stars yet.'}
                </p>
              ) : (
                goldStarsList.map((star) => (
                  <div key={star.id} className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-3">
                    <div className="flex items-center justify-between text-sm text-slate-200">
                      <span className="font-semibold text-slate-100">{star.teacher?.name ?? 'Teacher'}</span>
                      <span className="text-emerald-300">+{formatCurrency(star.amountEuro)}</span>
                    </div>
                    {star.message && (
                      <p className="mt-2 text-sm text-slate-300">{star.message}</p>
                    )}
                    <p className="mt-2 text-xs text-slate-500">
                      {new Date(star.createdAt).toLocaleDateString(locale === 'it' ? 'it-IT' : 'en-US')}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-emerald-400/25 shadow-[0_0_0_1px_rgba(16,185,129,0.2)] bg-gradient-to-br from-slate-900/60 via-slate-950/80 to-black p-6 text-slate-100 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
        <h2 className="text-lg font-semibold">
          {locale === 'it' ? 'Come migliorare' : 'How to improve from here'}
        </h2>
        <p className="mt-2 text-sm text-slate-300">{summaryLine}</p>
        <div className="mt-4 rounded-2xl border border-teal-400/30 bg-teal-500/10 p-4 text-sm text-teal-100">
          {recommendation}
        </div>
      </section>
    </div>
  );
}
