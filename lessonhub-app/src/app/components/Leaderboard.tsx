// file: src/app/components/Leaderboard.tsx
'use client';

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type LeaderboardData = {
    id: string;
    name: string | null;
    image: string | null;
    completedCount: number;
    averageCompletionTime: number;
    totalPoints: number;
    testsTaken: number;
    recentBadges: Array<{ slug: string; name: string; icon: string | null }>;
    speedTier?: 'fast' | 'average' | 'slow';
    savings?: number;
};

interface LeaderboardProps {
    leaderboardData: LeaderboardData[];
    copy?: {
        title: string;
        subtitle: string;
        rankLabel: string;
        studentLabel: string;
        pointsLabel: string;
        completedLabel: string;
        avgTimeLabel: string;
        savingsLabel: string;
        badgesLabel: string;
        anonymousLabel: string;
        durationEmpty: string;
        emptyTable: string;
        emptyList: string;
        testsTakenLabel: string;
        pointsSuffix: string;
    };
}

function formatDuration(milliseconds: number, emptyLabel: string) {
    if (milliseconds === 0) return emptyLabel;
    
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}

function anonymizeName(name: string | null, fallback: string): string {
    if (!name) return fallback;
    const parts = name.split(' ');
    if (parts.length > 1) {
        return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
    }
    return name;
}

const getSpeedEmoji = (tier: string | undefined, rank: number) => {
    if (rank === 1) return '⚡️';
    if (tier === 'fast') return '💨';
    if (tier === 'average') return '👟';
    if (tier === 'slow') return '🫏';
    return '';
};

const getInitials = (name: string | null | undefined) => {
    if (!name) return '??';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
};

const getSavingsMeta = (value: number | undefined) => {
    if (typeof value !== 'number' || Number.isNaN(value)) {
        return { label: '—', className: 'text-slate-500' };
    }
    const label = `€${value.toFixed(2)}`;
    if (value < 0) return { label, className: 'text-rose-300' };
    if (value > 0) return { label, className: 'text-emerald-300' };
    return { label, className: 'text-slate-300' };
};

const getBadgeIcon = (badge: LeaderboardData['recentBadges'][number]) => {
    if (badge.slug === 'perfect-10') return '💯';
    if (badge.slug === 'gold-star') return '⭐️';
    return badge.icon ?? '🎖️';
};

export default function Leaderboard({ leaderboardData, copy }: LeaderboardProps) {
  const t = {
    title: copy?.title ?? "🏆 Student Leaderboard",
    subtitle: copy?.subtitle ?? "Showing top 12 peers in your network.",
    rankLabel: copy?.rankLabel ?? "Rank",
    studentLabel: copy?.studentLabel ?? "Student",
    pointsLabel: copy?.pointsLabel ?? "Points",
    completedLabel: copy?.completedLabel ?? "Completed",
    avgTimeLabel: copy?.avgTimeLabel ?? "Avg. Time",
    savingsLabel: copy?.savingsLabel ?? "Savings",
    badgesLabel: copy?.badgesLabel ?? "Badges",
    anonymousLabel: copy?.anonymousLabel ?? "Anonymous",
    durationEmpty: copy?.durationEmpty ?? "N/A",
    emptyTable:
      copy?.emptyTable ??
      "No leaderboard activity yet. Submissions and grades will appear here.",
    emptyList: copy?.emptyList ?? "No leaderboard activity yet.",
    testsTakenLabel: copy?.testsTakenLabel ?? "{count} tests taken",
    pointsSuffix: copy?.pointsSuffix ?? "pts",
  };
  return (
    <div className="mt-12">
            <h2 className="mb-2 text-2xl font-bold text-slate-100">{t.title}</h2>
            <p className="mb-4 text-sm text-slate-400">{t.subtitle}</p>
            {/* Desktop/tablet table */}
            <div className="hidden overflow-hidden rounded-lg border border-slate-800/70 bg-slate-900/80 shadow-xl backdrop-blur-sm md:block">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-800">
                        <thead className="bg-slate-900/90">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">{t.rankLabel}</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">{t.studentLabel}</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">{t.pointsLabel}</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">{t.completedLabel}</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">{t.avgTimeLabel}</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">{t.savingsLabel}</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">{t.badgesLabel}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {leaderboardData.map((student, index) => {
                                const { label: savingsLabel, className: savingsClass } = getSavingsMeta(student.savings);
                                return (
                                  <tr key={student.id} className="hover:bg-slate-900/60 transition-colors">
                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-100">{index + 1}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-200">
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={student.image || ''} alt={student.name || ''} />
                                                <AvatarFallback>{getInitials(student.name)}</AvatarFallback>
                                            </Avatar>
                                            <Link
                                                href={`/profile/${student.id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm font-semibold text-teal-200 hover:text-teal-100"
                                            >
                                                {anonymizeName(student.name, t.anonymousLabel)}
                                            </Link>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-slate-100">
                                        {student.totalPoints.toLocaleString()} {t.pointsSuffix}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-400">{student.completedCount}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-400">
                                        <span className="mr-1 text-2xl">{getSpeedEmoji(student.speedTier, index + 1)}</span>
                                        {formatDuration(student.averageCompletionTime, t.durationEmpty)}
                                    </td>
                                    <td className={`px-4 py-3 whitespace-nowrap text-sm font-semibold ${savingsClass}`}>
                                        {savingsLabel}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-400">
                                        <div className="flex items-center gap-2">
                                            {student.recentBadges.length === 0 ? (
                                                <span className="text-xs text-slate-500">—</span>
                                            ) : (
                                                student.recentBadges.map((badge) => (
                                                    <span key={badge.slug} title={badge.name} className="text-lg">
                                                        {getBadgeIcon(badge)}
                                                    </span>
                                                ))
                                            )}
                                        </div>
                                    </td>
                                  </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {leaderboardData.length === 0 && (
                    <p className="p-6 text-center text-slate-400">{t.emptyTable}</p>
                )}
            </div>

            {/* Mobile compact list */}
            <div className="md:hidden space-y-3">
                {leaderboardData.map((student) => {
                    const { label: savingsLabel, className: savingsClass } = getSavingsMeta(student.savings);
                    return (
                      <div key={student.id} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/70 p-3 shadow-sm">
                        <div className="flex items-center gap-3 min-w-0">
                            <Avatar className="h-10 w-10 flex-shrink-0">
                                <AvatarImage src={student.image || ''} alt={student.name || ''} />
                                <AvatarFallback>{getInitials(student.name)}</AvatarFallback>
                            </Avatar>
                            <div className="truncate">
                                <Link
                                    href={`/profile/${student.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="truncate text-sm font-semibold text-teal-200 hover:text-teal-100"
                                >
                                    {anonymizeName(student.name, t.anonymousLabel)}
                                </Link>
                                <div className="text-xs text-slate-400">
                                  {t.testsTakenLabel.replace("{count}", student.testsTaken.toString())}
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs uppercase tracking-wide text-slate-500">{t.savingsLabel}</div>
                            <div className={`text-base font-semibold ${savingsClass}`}>{savingsLabel}</div>
                        </div>
                      </div>
                    );
                })}
                {leaderboardData.length === 0 && (
                    <p className="p-4 text-center text-slate-400">{t.emptyList}</p>
                )}
            </div>
        </div>
    );
}
