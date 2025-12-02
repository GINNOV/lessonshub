// file: src/app/components/TeacherClassLeaderboard.tsx
'use client';

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type LeaderboardData = {
    id: string;
    name: string | null;
    image: string | null;
    completedCount: number;
    savings: number;
    totalPoints: number;
    recentBadges: Array<{ slug: string; name: string; icon: string | null }>;
};

interface TeacherClassLeaderboardProps {
    leaderboardData: LeaderboardData[];
}

const getInitials = (name: string | null | undefined) => {
    if (!name) return '??';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
};

export default function TeacherClassLeaderboard({ leaderboardData }: TeacherClassLeaderboardProps) {
    return (
        <div className="mt-12">
            <h2 className="mb-3 text-2xl font-bold text-slate-100">🏆 Class Leaderboard</h2>
            <div className="overflow-hidden rounded-2xl border border-slate-800/70 bg-gradient-to-b from-slate-950/90 via-slate-950/80 to-slate-900/80 shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-800">
                        <thead className="bg-slate-900/80 backdrop-blur">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Rank</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Student</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Points</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Savings</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Lessons Completed</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Badges</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {leaderboardData.map((student, index) => (
                                <tr key={student.id} className="bg-slate-950/50 text-slate-100">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-200">{index + 1}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-100">
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
                                                {student.name || 'Anonymous'}
                                            </Link>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-100">
                                        {student.totalPoints.toLocaleString()} pts
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-100">€{student.savings.toFixed(2)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{student.completedCount}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                                        <div className="flex items-center gap-2">
                                            {student.recentBadges.length === 0 ? (
                                                <span className="text-xs text-slate-500">—</span>
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
                            ))}
                        </tbody>
                    </table>
                </div>
                {leaderboardData.length === 0 && (
                    <p className="p-6 text-center text-slate-400">No class activity yet. Graded submissions will appear here.</p>
                )}
            </div>
        </div>
    );
}
