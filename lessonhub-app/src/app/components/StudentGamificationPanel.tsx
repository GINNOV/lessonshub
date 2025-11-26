"use client";

import { useState } from "react";
import { Badge as UiBadge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";
import { BadgeCategory } from "@prisma/client";

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
  guidePoints?: number;
  goldStarPoints?: number;
  goldStarAmount?: number;
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
  ASSIGNMENT_GRADED: "Assignment graded",
  BADGE_BONUS: "Badge bonus",
  MANUAL_ADJUSTMENT: "Adjustment",
};

const categoryLabels: Record<BadgeCategory, string> = {
  PROGRESSION: "Progression",
  PERFORMANCE: "Performance",
  PARTICIPATION: "Participation",
};

function formatDate(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(date);
}

export default function StudentGamificationPanel({
  data,
}: StudentGamificationPanelProps) {
  const [achievementsExpanded, setAchievementsExpanded] = useState(false);

  if (!data) {
    return null;
  }

  const { totalPoints, badges, nextBadge, recentTransactions } = data;
  const guidePoints = data.guidePoints ?? 0;
  const goldStarPoints = data.goldStarPoints ?? 0;
  const goldStarAmount = data.goldStarAmount ?? 0;

  return (
    <div className="mb-10">
      <Card className="shadow-sm">
        <CardHeader className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Achievements</CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setAchievementsExpanded((value) => !value)}
              aria-label={
                achievementsExpanded ? "Hide achievements" : "Show achievements"
              }
              aria-expanded={achievementsExpanded}
              className={`h-10 w-10 rounded-full border transition ${
                achievementsExpanded
                  ? "border-purple-200 bg-purple-50 text-purple-800"
                  : "border-gray-200 bg-white text-gray-700 hover:border-purple-200 hover:text-purple-700"
              }`}
            >
              {achievementsExpanded ? (
                <ChevronDown className="h-5 w-5" strokeWidth={2.5} />
              ) : (
                <ChevronRight className="h-5 w-5" strokeWidth={2.5} />
              )}
            </Button>
          </div>
          {!achievementsExpanded && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                Track the points and badges you&apos;ve earned so far.
              </p>
              <p className="text-sm text-gray-500">
                🇮🇹 Guadagna punti per ottenere EXTRAS che ti consentono di avere
                opportunità addizionali ed estendere deadlines. Ogni BADGE
                ottenuto ti permette di ottenere un bonus di punti aggiuntivi.
              </p>
              <div className="flex flex-wrap gap-6 text-sm">
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {totalPoints.toLocaleString()} pts
                  </p>
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Lifetime points
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {badges.length}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Badges unlocked
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {guidePoints.toLocaleString()} pts
                  </p>
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Guides completed
                  </p>
                </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {goldStarPoints.toLocaleString()} pts
                </p>
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  Gold stars received
                </p>
                <p className="text-xs text-gray-400">≈ €{goldStarAmount.toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}
      </CardHeader>
        {achievementsExpanded && (
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {totalPoints.toLocaleString()} pts
                </p>
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  Lifetime points
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {badges.length}
                </p>
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  Badges unlocked
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {guidePoints.toLocaleString()} pts
                </p>
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  Guides completed
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {goldStarPoints.toLocaleString()} pts
                </p>
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  Gold stars received
                </p>
                <p className="text-xs text-gray-400">≈ €{goldStarAmount.toLocaleString()}</p>
              </div>
            </div>
            {badges.length === 0 ? (
              <p className="rounded-lg border border-dashed bg-gray-50 p-4 text-sm text-gray-500">
                Your first badge is just a lesson away. Submit a graded lesson
                to start collecting rewards.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {badges.map((badge) => (
                  <div
                    key={badge.id}
                    className="flex items-center gap-3 rounded-lg border bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="text-2xl">{badge.icon ?? "🎖️"}</div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {badge.name}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {categoryLabels[badge.category]}
                      </p>
                      <p className="truncate text-xs text-gray-400">
                        Earned {formatDate(badge.awardedAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-gray-700">Next up</h3>
                <p className="text-xs text-gray-500">
                  Peek at your upcoming rewards.
                </p>
              </div>
              {nextBadge ? (
                <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 text-sm text-purple-900">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{nextBadge.icon ?? "🎯"}</span>
                    <div>
                      <p className="font-semibold">{nextBadge.name}</p>
                      <p className="text-xs text-purple-800/80">
                        {nextBadge.description}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                  You&apos;ve unlocked every badge currently available.
                  Legendary status!
                </p>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-700">
                Recent activity
              </h3>
              {recentTransactions.length === 0 ? (
                <p className="mt-2 text-xs text-gray-500">
                  Points updates will appear here once your next lesson is
                  graded.
                </p>
              ) : (
                <ul className="mt-2 space-y-3">
                  {recentTransactions.map((transaction) => {
                    const friendlyReason =
                      reasonLabels[transaction.reason] ?? transaction.reason;
                    const isPositive = transaction.points >= 0;
                    return (
                      <li
                        key={transaction.id}
                        className="rounded-md border bg-white p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {friendlyReason}
                            </p>
                            {transaction.note && (
                              <p className="mt-1 text-xs text-gray-500">
                                {transaction.note}
                              </p>
                            )}
                          </div>
                          <UiBadge
                            variant={isPositive ? "default" : "destructive"}
                            className={
                              isPositive
                                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                                : undefined
                            }
                          >
                            {isPositive ? "+" : ""}
                            {transaction.points} pts
                          </UiBadge>
                        </div>
                        <p className="mt-2 text-xs text-gray-400">
                          {formatDate(transaction.createdAt)}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
