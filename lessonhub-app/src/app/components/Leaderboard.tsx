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
}

function formatDuration(milliseconds: number) {
    if (milliseconds === 0) return 'N/A';
    
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}

function anonymizeName(name: string | null): string {
    if (!name) return 'Anonymous';
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
        return { label: '—', className: 'text-gray-500' };
    }
    const label = `€${value.toFixed(2)}`;
    if (value < 0) return { label, className: 'text-red-600' };
    if (value > 0) return { label, className: 'text-emerald-600' };
    return { label, className: 'text-gray-700' };
};

export default function Leaderboard({ leaderboardData }: LeaderboardProps) {
    return (
        <div className="mt-12">
            <h2 className="text-2xl font-bold mb-4">🏆 Student Leaderboard</h2>
            {/* Desktop/tablet table */}
            <div className="bg-white shadow-md rounded-lg overflow-hidden hidden md:block">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Points</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg. Time</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Savings</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Badges</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {leaderboardData.map((student, index) => {
                                const { label: savingsLabel, className: savingsClass } = getSavingsMeta(student.savings);
                                return (
                                  <tr key={student.id}>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{index + 1}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={student.image || ''} alt={student.name || ''} />
                                                <AvatarFallback>{getInitials(student.name)}</AvatarFallback>
                                            </Avatar>
                                            <Link
                                                href={`/profile/${student.id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm font-medium text-purple-700 hover:underline"
                                            >
                                                {anonymizeName(student.name)}
                                            </Link>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-700">
                                        {student.totalPoints.toLocaleString()} pts
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{student.completedCount}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                        <span className="text-2xl mr-1">{getSpeedEmoji(student.speedTier, index + 1)}</span>
                                        {formatDuration(student.averageCompletionTime)}
                                    </td>
                                    <td className={`px-4 py-3 whitespace-nowrap text-sm font-semibold ${savingsClass}`}>
                                        {savingsLabel}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                        <div className="flex items-center gap-2">
                                            {student.recentBadges.length === 0 ? (
                                                <span className="text-xs text-gray-400">—</span>
                                            ) : (
                                                student.recentBadges.map((badge) => (
                                                    <span key={badge.slug} title={badge.name} className="text-lg">
                                                        {badge.icon ?? '🎖️'}
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
                    <p className="p-6 text-center text-gray-500">No leaderboard activity yet. Submissions and grades will appear here.</p>
                )}
            </div>

            {/* Mobile compact list */}
            <div className="md:hidden space-y-3">
                {leaderboardData.map((student) => {
                    const { label: savingsLabel, className: savingsClass } = getSavingsMeta(student.savings);
                    return (
                      <div key={student.id} className="flex items-center justify-between rounded-lg border bg-white p-3 shadow-sm">
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
                                    className="text-sm font-semibold text-gray-900 truncate hover:text-purple-700"
                                >
                                    {anonymizeName(student.name)}
                                </Link>
                                <div className="text-xs text-gray-500">{student.testsTaken} tests taken</div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs uppercase tracking-wide text-gray-400">Savings</div>
                            <div className={`text-base font-semibold ${savingsClass}`}>{savingsLabel}</div>
                        </div>
                      </div>
                    );
                })}
                {leaderboardData.length === 0 && (
                    <p className="p-4 text-center text-gray-500">No leaderboard activity yet.</p>
                )}
            </div>
        </div>
    );
}
