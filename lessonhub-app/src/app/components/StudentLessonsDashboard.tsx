// file: src/app/components/StudentLessonsDashboard.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StudentStatsHeader from '@/app/components/StudentStatsHeader';
import HubGuideBanner from '@/app/components/HubGuideBanner';
import StudentLessonList, { StudentLessonFilter } from '@/app/components/StudentLessonList';
import StudentGuideList from '@/app/components/StudentGuideList';
import StudentFreeLessonList from '@/app/components/StudentFreeLessonList';
import StudentGamificationPanel from '@/app/components/StudentGamificationPanel';
import Leaderboard from '@/app/components/Leaderboard';
import { BookOpen, Sparkles, Gift, Gamepad2, Flame, Zap, PiggyBank } from 'lucide-react';
import type { StudentDashboardLocale } from '@/lib/studentDashboardCopy';

type StudentDashboardCopy = {
  stats: NonNullable<React.ComponentProps<typeof StudentStatsHeader>['copy']>;
  lessons: NonNullable<React.ComponentProps<typeof StudentLessonList>['copy']>;
  guides: {
    tabLabel: string;
    bannerKicker: string;
    bannerTitle: string;
    bannerBody: string;
    bannerCta: string;
    countSingle: string;
    countPlural: string;
    countZero: string;
    searchPlaceholder: string;
    emptyPaid: string;
    emptyFree: string;
  };
  gamification: NonNullable<React.ComponentProps<typeof StudentGamificationPanel>['copy']>;
  leaderboard: NonNullable<React.ComponentProps<typeof Leaderboard>['copy']>;
};

interface StudentLessonsDashboardProps {
  stats: {
    totalValue: number;
    totalPoints: number;
    total: number;
    pending: number;
    submitted: number;
    graded: number;
    failed: number;
    pastDue: number;
  };
  settings: React.ComponentProps<typeof StudentStatsHeader>['settings'];
  copy: StudentDashboardCopy;
  locale: StudentDashboardLocale;
  isPaying: boolean;
  assignments: React.ComponentProps<typeof StudentLessonList>['assignments'];
  guidesForTab: React.ComponentProps<typeof StudentGuideList>['guides'];
  freeLessons: React.ComponentProps<typeof StudentFreeLessonList>['lessons'];
  bannerCopies: React.ComponentProps<typeof HubGuideBanner>['banners'];
  gamificationSnapshot: React.ComponentProps<typeof StudentGamificationPanel>['data'];
  leaderboardData: React.ComponentProps<typeof Leaderboard>['leaderboardData'];
}

export default function StudentLessonsDashboard({
  stats,
  settings,
  copy,
  locale,
  isPaying,
  assignments,
  guidesForTab,
  freeLessons,
  bannerCopies,
  gamificationSnapshot,
  leaderboardData,
}: StudentLessonsDashboardProps) {
  const searchParams = useSearchParams();
  const requestedTab = useMemo(() => searchParams?.get('tab') ?? '', [searchParams]);
  const [assignmentFilter, setAssignmentFilter] = useState<StudentLessonFilter | null>('all');
  const [activeTab, setActiveTab] = useState(isPaying ? 'lessons' : 'free');
  const showAllContent =
    assignmentFilter === null || assignmentFilter === 'all' || assignmentFilter === 'bought';
  const gameTiles = [
    {
      label: 'Invasion',
      href: 'https://quantifythis.com/games/invasion',
      icon: Gamepad2,
      color: 'border-emerald-200 bg-emerald-50/70 text-emerald-900',
      status: locale === 'it' ? 'Gioca ora' : 'Play now',
    },
    {
      label: 'Frog Verbs',
      href: '/games/frog-verbs',
      icon: Sparkles,
      color: 'border-lime-200 bg-lime-50/80 text-lime-900',
      status: locale === 'it' ? 'Gioca ora' : 'Play now',
    },
    {
      label: 'ArkanING',
      href: '/games/arkaning',
      icon: Zap,
      color: 'border-sky-200 bg-sky-50/80 text-sky-900',
      status: locale === 'it' ? 'Gioca ora' : 'Play now',
    },
    {
      label: 'Naked Adjectives',
      href: null,
      icon: Flame,
      color: 'border-slate-700/60 bg-slate-900/40 text-slate-200',
      status: locale === 'it' ? 'In arrivo' : 'Coming soon',
    },
  ];
  const renderGameTiles = () => (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {gameTiles.map(({ label, href, icon: Icon, color, status }) => {
        const isExternal = href?.startsWith('http');

        if (href) {
          return (
            <Link
              key={label}
              href={href}
              target={isExternal ? '_blank' : undefined}
              rel={isExternal ? 'noreferrer' : undefined}
              className={`block rounded-xl border ${color} p-8 text-center shadow-sm transition-shadow hover:shadow-lg`}
            >
              <div className="flex flex-col items-center gap-3">
                <Icon className="h-10 w-10" />
                <span className="text-lg font-semibold">{label}</span>
                <span className="text-xs uppercase tracking-wide opacity-70">{status}</span>
              </div>
            </Link>
          );
        }

        return (
          <div key={label} className={`rounded-xl border ${color} p-8 text-center opacity-70`}>
            <div className="flex flex-col items-center gap-3">
              <Icon className="h-10 w-10" />
              <span className="text-lg font-semibold">{label}</span>
              <span className="text-xs uppercase tracking-wide opacity-70">{status}</span>
            </div>
          </div>
        );
      })}
    </div>
  );

  const handleFilterSelect = (filter: StudentLessonFilter) => {
    setAssignmentFilter(filter);
    if (filter === 'bought') {
      setActiveTab('bought');
      return;
    }
    if (filter !== 'all') {
      setActiveTab('lessons');
    }
  };

  useEffect(() => {
    if (!requestedTab) return;
    const normalized = requestedTab.toLowerCase();
    if (normalized === 'games') setActiveTab('games');
    if (normalized === 'guides') setActiveTab('guides');
    if (normalized === 'lessons') setActiveTab('lessons');
    if (normalized === 'bought') {
      setActiveTab('bought');
      setAssignmentFilter('bought');
    }
    if (normalized === 'free' && !isPaying) setActiveTab('free');
  }, [isPaying, requestedTab]);

  return (
    <>
      <StudentStatsHeader
        totalValue={stats.totalValue}
        totalPoints={stats.totalPoints}
        total={stats.total}
        pending={stats.pending}
        submitted={stats.submitted}
        graded={stats.graded}
        failed={stats.failed}
        pastDue={stats.pastDue}
        settings={settings}
        copy={copy.stats}
        locale={locale}
        activeFilter={assignmentFilter}
        onFilterSelect={handleFilterSelect}
      />
      <section className="mt-10 space-y-6">
        {showAllContent && (
          <HubGuideBanner guideCount={guidesForTab.length} copy={copy.guides} banners={bannerCopies} />
        )}
        {isPaying ? (
          showAllContent ? (
            <Tabs
              value={activeTab}
              onValueChange={(nextTab) => {
                setActiveTab(nextTab);
                if (nextTab === 'bought') {
                  setAssignmentFilter('bought');
                } else if (nextTab === 'lessons' && assignmentFilter === 'bought') {
                  setAssignmentFilter('all');
                }
              }}
              className="space-y-6"
            >
              <TabsList className="mb-2 flex h-auto w-full flex-wrap items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/70 px-2 py-1 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                <TabsTrigger
                  value="lessons"
                  className="flex-1 min-w-[140px] rounded-lg border border-transparent px-3 py-2 text-sm font-semibold text-slate-300 transition data-[state=active]:border-teal-400/50 data-[state=active]:bg-slate-800 data-[state=active]:text-teal-200 data-[state=active]:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40"
                >
                  <span className="flex items-center justify-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    {locale === "it" ? "Lezioni" : "Lessons"}
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="bought"
                  className="flex-1 min-w-[140px] rounded-lg border border-transparent px-3 py-2 text-sm font-semibold text-slate-300 transition data-[state=active]:border-amber-400/60 data-[state=active]:bg-slate-800 data-[state=active]:text-amber-200 data-[state=active]:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
                  onClick={() => setAssignmentFilter('bought')}
                >
                  <span className="flex items-center justify-center gap-2">
                    <PiggyBank className="h-4 w-4" />
                    {locale === 'it' ? 'Mercato' : 'Bought'}
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="guides"
                  className="flex-1 min-w-[140px] rounded-lg border border-transparent px-3 py-2 text-sm font-semibold text-slate-300 transition data-[state=active]:border-teal-400/50 data-[state=active]:bg-slate-800 data-[state=active]:text-teal-200 data-[state=active]:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40"
                >
                  <span className="flex items-center justify-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    {copy.guides.tabLabel}
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="games"
                  className="flex-1 min-w-[140px] rounded-lg border border-transparent px-3 py-2 text-sm font-semibold text-slate-300 transition data-[state=active]:border-teal-400/50 data-[state=active]:bg-slate-800 data-[state=active]:text-teal-200 data-[state=active]:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40"
                >
                  <span className="flex items-center justify-center gap-2">
                    <Gamepad2 className="h-4 w-4" />
                    {locale === 'it' ? 'Giochi' : 'Games'}
                  </span>
                </TabsTrigger>
              </TabsList>
              <TabsContent value="lessons">
                <StudentLessonList
                  assignments={assignments}
                  copy={copy.lessons}
                  filter={assignmentFilter ?? undefined}
                  onFilterChange={handleFilterSelect}
                />
              </TabsContent>
              <TabsContent value="bought">
                <StudentLessonList
                  assignments={assignments}
                  copy={copy.lessons}
                  filter="bought"
                  onFilterChange={handleFilterSelect}
                />
              </TabsContent>
              <TabsContent value="guides">
                {guidesForTab.length > 0 ? (
                  <StudentGuideList guides={guidesForTab} copy={copy.guides} />
                ) : (
                  <div className="rounded-2xl border border-dashed p-6 text-center text-gray-600">
                    {copy.guides.emptyPaid}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="games">
                {renderGameTiles()}
              </TabsContent>
            </Tabs>
          ) : (
            <StudentLessonList
              assignments={assignments}
              copy={copy.lessons}
              filter={assignmentFilter ?? undefined}
              onFilterChange={handleFilterSelect}
            />
          )
        ) : showAllContent ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="mb-2 flex h-auto w-full flex-wrap items-stretch gap-2 rounded-2xl border border-slate-800 bg-slate-900/70 p-3 shadow-[0_10px_30px_rgba(0,0,0,0.35)] ring-1 ring-slate-800/70">
              <TabsTrigger
                value="free"
                className="flex-1 min-w-[150px] rounded-lg border border-transparent px-3 py-2 text-sm font-semibold text-slate-300 transition data-[state=active]:border-teal-400/50 data-[state=active]:bg-slate-800 data-[state=active]:text-teal-200 data-[state=active]:shadow-lg data-[state=active]:ring-1 data-[state=active]:ring-teal-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40"
              >
                <span className="flex items-center justify-center gap-2">
                  <Gift className="h-4 w-4" />
                  {locale === "it" ? "Lezioni gratuite" : "Free Lessons"}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="lessons"
                className="flex-1 min-w-[150px] rounded-lg border border-transparent px-3 py-2 text-sm font-semibold text-slate-300 transition data-[state=active]:border-teal-400/50 data-[state=active]:bg-slate-800 data-[state=active]:text-teal-200 data-[state=active]:shadow-lg data-[state=active]:ring-1 data-[state=active]:ring-teal-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40"
              >
                <span className="flex items-center justify-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  {locale === "it" ? "Le mie lezioni" : "My Lessons"}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="guides"
                className="flex-1 min-w-[150px] rounded-lg border border-transparent px-3 py-2 text-sm font-semibold text-slate-300 transition data-[state=active]:border-teal-400/50 data-[state=active]:bg-slate-800 data-[state=active]:text-teal-200 data-[state=active]:shadow-lg data-[state=active]:ring-1 data-[state=active]:ring-teal-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40"
              >
                <span className="flex items-center justify-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  {copy.guides.tabLabel}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="games"
                className="flex-1 min-w-[150px] rounded-lg border border-transparent px-3 py-2 text-sm font-semibold text-slate-300 transition data-[state=active]:border-teal-400/50 data-[state=active]:bg-slate-800 data-[state=active]:text-teal-200 data-[state=active]:shadow-lg data-[state=active]:ring-1 data-[state=active]:ring-teal-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40"
              >
                <span className="flex items-center justify-center gap-2">
                  <Gamepad2 className="h-4 w-4" />
                  {locale === 'it' ? 'Giochi' : 'Games'}
                </span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="free">
              <StudentFreeLessonList
                lessons={freeLessons}
                copy={{ searchPlaceholder: copy.guides.searchPlaceholder, emptyFree: copy.guides.emptyFree }}
              />
            </TabsContent>
            <TabsContent value="lessons">
              <StudentLessonList
                assignments={assignments}
                copy={copy.lessons}
                filter={assignmentFilter ?? undefined}
                onFilterChange={handleFilterSelect}
              />
            </TabsContent>
            <TabsContent value="guides">
              {guidesForTab.length > 0 ? (
                <StudentGuideList guides={guidesForTab} copy={copy.guides} />
              ) : (
                <div className="rounded-2xl border border-dashed p-6 text-center text-gray-600">
                  {copy.guides.emptyFree}
                </div>
              )}
            </TabsContent>
            <TabsContent value="games">
              {renderGameTiles()}
            </TabsContent>
          </Tabs>
        ) : (
          <StudentLessonList
            assignments={assignments}
            copy={copy.lessons}
            filter={assignmentFilter ?? undefined}
            onFilterChange={handleFilterSelect}
          />
        )}
      </section>

      <div className="mt-10 space-y-8">
        <StudentGamificationPanel data={gamificationSnapshot} copy={copy.gamification} />
        <Leaderboard leaderboardData={leaderboardData} copy={copy.leaderboard} />
      </div>
    </>
  );
}
