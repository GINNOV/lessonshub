import { Badge as UiBadge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BadgeCategory } from '@prisma/client';

type GamificationBadge = {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string | null;
  category: BadgeCategory;
  awardedAt: string;
};

type GamificationTransaction = {
  id: string;
  points: number;
  reason: string;
  note?: string | null;
  createdAt: string;
};

type GamificationSnapshot = {
  totalPoints: number;
  badges: GamificationBadge[];
  nextBadge: {
    slug: string;
    name: string;
    description: string;
    icon: string | null;
    category: BadgeCategory;
  } | null;
  recentTransactions: GamificationTransaction[];
};

interface StudentGamificationPanelProps {
  data: GamificationSnapshot | null;
}

const reasonLabels: Record<string, string> = {
  ASSIGNMENT_GRADED: 'Assignment graded',
  BADGE_BONUS: 'Badge bonus',
  MANUAL_ADJUSTMENT: 'Adjustment',
};

const categoryLabels: Record<BadgeCategory, string> = {
  PROGRESSION: 'Progression',
  PERFORMANCE: 'Performance',
  PARTICIPATION: 'Participation',
};

function formatDate(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
  }).format(date);
}

export default function StudentGamificationPanel({ data }: StudentGamificationPanelProps) {
  if (!data) {
    return null;
  }

  const { totalPoints, badges, nextBadge, recentTransactions } = data;

  return (
    <div className="mb-10 grid gap-6 lg:grid-cols-[2fr_1fr]">
      <Card className="shadow-sm">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Achievements</CardTitle>
            <p className="text-sm text-gray-500">Track the points and badges you&apos;ve earned so far.</p>
          </div>
          <div className="flex gap-6 text-sm">
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalPoints.toLocaleString()} pts</p>
              <p className="text-xs uppercase tracking-wide text-gray-500">Lifetime points</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{badges.length}</p>
              <p className="text-xs uppercase tracking-wide text-gray-500">Badges unlocked</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {badges.length === 0 ? (
            <p className="rounded-lg border border-dashed bg-gray-50 p-4 text-sm text-gray-500">
              Your first badge is just a lesson away. Submit a graded lesson to start collecting rewards.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {badges.map((badge) => (
                <div
                  key={badge.id}
                  className="flex items-center gap-3 rounded-lg border bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="text-2xl">{badge.icon ?? '🎖️'}</div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">{badge.name}</p>
                    <p className="truncate text-xs text-gray-500">{categoryLabels[badge.category]}</p>
                    <p className="truncate text-xs text-gray-400">Earned {formatDate(badge.awardedAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Next Up</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {nextBadge ? (
            <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 text-sm text-purple-900">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{nextBadge.icon ?? '🎯'}</span>
                <div>
                  <p className="font-semibold">{nextBadge.name}</p>
                  <p className="text-xs text-purple-800/80">{nextBadge.description}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              You&apos;ve unlocked every badge currently available. Legendary status!
            </p>
          )}

          <div>
            <h3 className="text-sm font-semibold text-gray-700">Recent activity</h3>
            {recentTransactions.length === 0 ? (
              <p className="mt-2 text-xs text-gray-500">
                Points updates will appear here once your next lesson is graded.
              </p>
            ) : (
              <ul className="mt-2 space-y-3">
                {recentTransactions.map((transaction) => {
                  const friendlyReason = reasonLabels[transaction.reason] ?? transaction.reason;
                  const isPositive = transaction.points >= 0;
                  return (
                    <li key={transaction.id} className="rounded-md border bg-white p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{friendlyReason}</p>
                          {transaction.note && (
                            <p className="mt-1 text-xs text-gray-500">{transaction.note}</p>
                          )}
                        </div>
                        <UiBadge
                          variant={isPositive ? 'default' : 'destructive'}
                          className={isPositive ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : undefined}
                        >
                          {isPositive ? '+' : ''}
                          {transaction.points} pts
                        </UiBadge>
                      </div>
                      <p className="mt-2 text-xs text-gray-400">{formatDate(transaction.createdAt)}</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
