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
  copy?: {
    title: string;
    toggleShow: string;
    toggleHide: string;
    summaryLine1: string;
    summaryLine2: string;
    lifetimePointsLabel: string;
    badgesUnlockedLabel: string;
    guidesCompletedLabel: string;
    goldStarsReceivedLabel: string;
    firstBadgeEmpty: string;
    nextUpTitle: string;
    nextUpSubtitle: string;
    allBadgesUnlocked: string;
    earnedLabel: string;
    pointsSuffix: string;
    recentActivityTitle: string;
    recentActivityEmpty: string;
    reasonLabels: Record<string, string>;
    categoryLabels: Record<BadgeCategory, string>;
  };
}

function formatDate(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(date);
}

export default function StudentGamificationPanel({
  data,
  copy,
}: StudentGamificationPanelProps) {
  const t = {
    title: copy?.title ?? "Achievements",
    toggleShow: copy?.toggleShow ?? "Show achievements",
    toggleHide: copy?.toggleHide ?? "Hide achievements",
    summaryLine1:
      copy?.summaryLine1 ?? "Track the points and badges you've earned so far.",
    summaryLine2:
      copy?.summaryLine2 ??
      "Earn points to unlock extras like new opportunities and deadline extensions. Every badge adds bonus points.",
    lifetimePointsLabel: copy?.lifetimePointsLabel ?? "Lifetime points",
    badgesUnlockedLabel: copy?.badgesUnlockedLabel ?? "Badges unlocked",
    guidesCompletedLabel: copy?.guidesCompletedLabel ?? "Guides completed",
    goldStarsReceivedLabel: copy?.goldStarsReceivedLabel ?? "Gold stars received",
    firstBadgeEmpty:
      copy?.firstBadgeEmpty ??
      "Your first badge is just a lesson away. Submit a graded lesson to start collecting rewards.",
    nextUpTitle: copy?.nextUpTitle ?? "Next up",
    nextUpSubtitle: copy?.nextUpSubtitle ?? "Peek at your upcoming rewards.",
    allBadgesUnlocked:
      copy?.allBadgesUnlocked ??
      "You've unlocked every badge currently available. Legendary status!",
    earnedLabel: copy?.earnedLabel ?? "Earned {date}",
    pointsSuffix: copy?.pointsSuffix ?? "pts",
    recentActivityTitle: copy?.recentActivityTitle ?? "Recent activity",
    recentActivityEmpty:
      copy?.recentActivityEmpty ??
      "Points updates will appear here once your next lesson is graded.",
    reasonLabels: copy?.reasonLabels ?? {
      ASSIGNMENT_GRADED: "Assignment graded",
      BADGE_BONUS: "Badge bonus",
      MANUAL_ADJUSTMENT: "Adjustment",
    },
    categoryLabels: copy?.categoryLabels ?? {
      PROGRESSION: "Progression",
      PERFORMANCE: "Performance",
      PARTICIPATION: "Participation",
    },
  };
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
      <Card className="border border-slate-800/70 bg-slate-900/70 text-slate-100 shadow-xl backdrop-blur-sm">
        <CardHeader className="flex flex-col gap-2 border-b border-slate-800/70 pb-4">
          <div className="flex items-center justify-between gap-3">
            <CardTitle>{t.title}</CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setAchievementsExpanded((value) => !value)}
              aria-label={
                achievementsExpanded ? t.toggleHide : t.toggleShow
              }
              aria-expanded={achievementsExpanded}
              className={`h-10 w-10 rounded-full border transition ${
                achievementsExpanded
                  ? "border-teal-300/60 bg-teal-500/20 text-teal-100 shadow-[0_10px_30px_rgba(45,212,191,0.25)]"
                  : "border-slate-700 bg-slate-800/70 text-slate-200 hover:border-teal-400/70 hover:text-white"
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
              <p className="text-sm text-slate-400">
                {t.summaryLine1}
              </p>
              <p className="text-sm text-slate-400">
                {t.summaryLine2}
              </p>
              <div className="flex flex-wrap gap-6 text-sm">
                <div>
                  <p className="text-2xl font-bold text-slate-50">
                    {totalPoints.toLocaleString()} {t.pointsSuffix}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    {t.lifetimePointsLabel}
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-50">
                    {badges.length}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    {t.badgesUnlockedLabel}
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-50">
                    {guidePoints.toLocaleString()} {t.pointsSuffix}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    {t.guidesCompletedLabel}
                  </p>
                </div>
              <div>
                <p className="text-2xl font-bold text-slate-50">
                  {goldStarPoints.toLocaleString()} {t.pointsSuffix}
                </p>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  {t.goldStarsReceivedLabel}
                </p>
                <p className="text-xs text-slate-500">≈ €{goldStarAmount.toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}
      </CardHeader>
        {achievementsExpanded && (
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <p className="text-2xl font-bold text-slate-50">
                  {totalPoints.toLocaleString()} {t.pointsSuffix}
                </p>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  {t.lifetimePointsLabel}
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-50">
                  {badges.length}
                </p>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  {t.badgesUnlockedLabel}
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-50">
                  {guidePoints.toLocaleString()} {t.pointsSuffix}
                </p>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  {t.guidesCompletedLabel}
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-50">
                  {goldStarPoints.toLocaleString()} {t.pointsSuffix}
                </p>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  {t.goldStarsReceivedLabel}
                </p>
                <p className="text-xs text-slate-500">≈ €{goldStarAmount.toLocaleString()}</p>
              </div>
            </div>
            {badges.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-300">
                {t.firstBadgeEmpty}
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {badges.map((badge) => (
                  <div
                    key={badge.id}
                    className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/70 p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:border-teal-400/50"
                  >
                    <div className="text-2xl">{badge.icon ?? "🎖️"}</div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-50">
                        {badge.name}
                      </p>
                      <p className="truncate text-xs text-slate-400">
                        {t.categoryLabels[badge.category]}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {t.earnedLabel.replace("{date}", formatDate(badge.awardedAt))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-100">{t.nextUpTitle}</h3>
                <p className="text-xs text-slate-400">
                  {t.nextUpSubtitle}
                </p>
              </div>
              {nextBadge ? (
                <div className="rounded-lg border border-teal-300/60 bg-teal-500/10 p-4 text-sm text-teal-50">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{nextBadge.icon ?? "🎯"}</span>
                    <div>
                      <p className="font-semibold">{nextBadge.name}</p>
                      <p className="text-xs text-teal-100/80">
                        {nextBadge.description}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="rounded-lg border border-emerald-300/60 bg-emerald-500/10 p-4 text-sm text-emerald-50">
                  {t.allBadgesUnlocked}
                </p>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                {t.recentActivityTitle}
              </h3>
              {recentTransactions.length === 0 ? (
                <p className="mt-2 text-xs text-slate-400">
                  {t.recentActivityEmpty}
                </p>
              ) : (
                <ul className="mt-2 space-y-3">
                  {recentTransactions.map((transaction) => {
                    const friendlyReason =
                      t.reasonLabels[transaction.reason] ?? transaction.reason;
                    const isPositive = transaction.points >= 0;
                    return (
                      <li
                        key={transaction.id}
                        className="rounded-md border border-slate-800 bg-slate-900/70 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-slate-100">
                              {friendlyReason}
                            </p>
                            {transaction.note && (
                              <p className="mt-1 text-xs text-slate-400">
                                {transaction.note}
                              </p>
                            )}
                          </div>
                          <UiBadge
                            variant={isPositive ? "default" : "destructive"}
                            className={
                              isPositive
                                ? "bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/20"
                                : undefined
                            }
                          >
                            {isPositive ? "+" : ""}
                            {transaction.points} {t.pointsSuffix}
                          </UiBadge>
                        </div>
                        <p className="mt-2 text-xs text-slate-500">
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
