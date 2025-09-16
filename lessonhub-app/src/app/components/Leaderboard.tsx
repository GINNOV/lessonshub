// file: src/app/components/Leaderboard.tsx
'use client';

type LeaderboardData = {
    id: string;
    name: string | null;
    completedCount: number;
    averageCompletionTime: number;
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

export default function Leaderboard({ leaderboardData }: LeaderboardProps) {
    return (
        <div className="mt-12">
            <h2 className="text-2xl font-bold mb-4">🏆 Student Leaderboard</h2>
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lessons Completed</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg. Completion Time</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {leaderboardData.map((student, index) => (
                                <tr key={student.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{index + 1}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{anonymizeName(student.name)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.completedCount}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDuration(student.averageCompletionTime)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {leaderboardData.length === 0 && (
                    <p className="p-6 text-center text-gray-500">No student data available yet. Complete some lessons to see the leaderboard!</p>
                )}
            </div>
        </div>
    );
}