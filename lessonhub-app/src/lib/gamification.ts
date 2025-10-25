import { AssignmentStatus, BadgeCategory, PointReason, Prisma } from '@prisma/client';
import prisma from './prisma';

export type BadgeContext = {
  totalPoints: number;
  gradedCount: number;
  highScoreCount: number;
  perfectScoreCount: number;
  lastScore: number;
  hasFailures: boolean;
};

export type BadgeDefinition = {
  slug: string;
  name: string;
  description: string;
  icon: string;
  category: BadgeCategory;
  bonusPoints?: number;
  check: (context: BadgeContext) => boolean;
};

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    slug: 'first-steps',
    name: 'First Steps',
    description: 'Complete your first graded lesson.',
    icon: '🥇',
    category: BadgeCategory.PROGRESSION,
    bonusPoints: 20,
    check: (ctx) => ctx.gradedCount >= 1,
  },
  {
    slug: 'tenacious-learner',
    name: 'Tenacious Learner',
    description: 'Earn grades on ten lessons.',
    icon: '🧗',
    category: BadgeCategory.PROGRESSION,
    bonusPoints: 40,
    check: (ctx) => ctx.gradedCount >= 10,
  },
  {
    slug: 'high-flier',
    name: 'High Flier',
    description: 'Score 9 or higher on five graded lessons.',
    icon: '🚀',
    category: BadgeCategory.PERFORMANCE,
    bonusPoints: 35,
    check: (ctx) => ctx.highScoreCount >= 5,
  },
  {
    slug: 'perfect-10',
    name: 'Perfect 10',
    description: 'Achieve a perfect score on any lesson.',
    icon: '🌟',
    category: BadgeCategory.PERFORMANCE,
    bonusPoints: 25,
    check: (ctx) => ctx.lastScore === 10 || ctx.perfectScoreCount >= 1,
  },
  {
    slug: 'points-hoarder',
    name: 'Points Hoarder',
    description: 'Accumulate 500 total points.',
    icon: '💎',
    category: BadgeCategory.PARTICIPATION,
    bonusPoints: 50,
    check: (ctx) => ctx.totalPoints >= 500,
  },
];

export function calculateAssignmentPoints(args: {
  score: number;
  difficulty?: number | null;
  deadline: Date;
  gradedAt: Date;
  assignedAt: Date;
}) {
  const { score, difficulty, deadline, gradedAt, assignedAt } = args;
  const normalizedScore = Math.max(score, 0);
  const basePoints = normalizedScore * 10;

  const normalizedDifficulty = Math.max(difficulty ?? 1, 1);
  const difficultyBonus = normalizedDifficulty * 5;

  const onTimeBonus = gradedAt <= deadline ? 20 : 0;
  const timeToGradeMs = Math.max(gradedAt.getTime() - assignedAt.getTime(), 0);
  const hoursToGrade = timeToGradeMs / (1000 * 60 * 60);

  let speedBonus = 0;
  if (hoursToGrade <= 24) {
    speedBonus = 20;
  } else if (hoursToGrade <= 72) {
    speedBonus = 10;
  }

  const totalPoints = basePoints + difficultyBonus + onTimeBonus + speedBonus;
  return Math.max(0, Math.round(totalPoints));
}

export async function ensureBadgeCatalog(tx: Prisma.TransactionClient = prisma) {
  for (const badge of BADGE_DEFINITIONS) {
    await tx.badge.upsert({
      where: { slug: badge.slug },
      update: {
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        category: badge.category,
      },
      create: {
        slug: badge.slug,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        category: badge.category,
      },
    });
  }
}

export async function awardBadgesForStudent({
  tx,
  studentId,
  assignmentId,
  score,
  totalPoints,
}: {
  tx: Prisma.TransactionClient;
  studentId: string;
  assignmentId: string;
  score: number;
  totalPoints: number;
}) {
  await ensureBadgeCatalog(tx);

  const [gradedCount, highScoreCount, perfectScoreCount, hasFailures, existingBadges, badgeCatalog] =
    await Promise.all([
      tx.assignment.count({
        where: {
          studentId,
          status: AssignmentStatus.GRADED,
        },
      }),
      tx.assignment.count({
        where: {
          studentId,
          status: AssignmentStatus.GRADED,
          score: {
            gte: 9,
          },
        },
      }),
      tx.assignment.count({
        where: {
          studentId,
          status: AssignmentStatus.GRADED,
          score: 10,
        },
      }),
      tx.assignment.count({
        where: {
          studentId,
          status: AssignmentStatus.FAILED,
        },
      }),
      tx.userBadge.findMany({
        where: { userId: studentId },
        select: {
          badge: {
            select: {
              slug: true,
            },
          },
        },
      }),
      tx.badge.findMany({
        where: {
          slug: {
            in: BADGE_DEFINITIONS.map((b) => b.slug),
          },
        },
      }),
    ]);

  const context: BadgeContext = {
    totalPoints,
    gradedCount,
    highScoreCount,
    perfectScoreCount,
    lastScore: score,
    hasFailures: hasFailures > 0,
  };

  const ownedSlugs = new Set(existingBadges.map((entry) => entry.badge.slug));
  const catalogBySlug = new Map(badgeCatalog.map((badge) => [badge.slug, badge]));

  const awardedBadges: {
    badgeId: string;
    slug: string;
    name: string;
    icon: string | null;
    bonusPoints: number;
  }[] = [];
  let pointsRunningTotal = totalPoints;

  for (const definition of BADGE_DEFINITIONS) {
    if (ownedSlugs.has(definition.slug)) {
      continue;
    }

    if (!definition.check(context)) {
      continue;
    }

    const matchingBadge = catalogBySlug.get(definition.slug);
    if (!matchingBadge) {
      continue;
    }

    await tx.userBadge.create({
      data: {
        userId: studentId,
        badgeId: matchingBadge.id,
        assignmentId,
        metadata: {
          awardedForScore: score,
          totalPointsAtAward: pointsRunningTotal,
        },
      },
    });

    const bonusPoints = definition.bonusPoints ?? 0;
    awardedBadges.push({
      badgeId: matchingBadge.id,
      slug: matchingBadge.slug,
      name: matchingBadge.name,
      icon: matchingBadge.icon,
      bonusPoints,
    });

    if (bonusPoints > 0) {
      pointsRunningTotal += bonusPoints;
      await tx.pointTransaction.create({
        data: {
          userId: studentId,
          assignmentId,
          points: bonusPoints,
          reason: PointReason.BADGE_BONUS,
          note: `${matchingBadge.name} badge bonus`,
        },
      });
    }

    // Update context so later badges see fresh totals/counts
    context.totalPoints = pointsRunningTotal;
  }

  if (pointsRunningTotal !== totalPoints) {
    await tx.user.update({
      where: { id: studentId },
      data: {
        totalPoints: pointsRunningTotal,
      },
    });
  }

  return {
    totalPoints: pointsRunningTotal,
    awardedBadges,
  };
}

export async function getStudentGamificationSnapshot(studentId: string) {
  if (!studentId) {
    return null;
  }

  await ensureBadgeCatalog();

  const [user, earnedBadges, transactions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: studentId },
      select: {
        totalPoints: true,
      },
    }),
    prisma.userBadge.findMany({
      where: { userId: studentId },
      include: {
        badge: true,
      },
      orderBy: {
        awardedAt: 'desc',
      },
    }),
    prisma.pointTransaction.findMany({
      where: { userId: studentId },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    }),
  ]);

  const definitions = await prisma.badge.findMany({
    where: {
      slug: {
        in: BADGE_DEFINITIONS.map((b) => b.slug),
      },
    },
  });

  const earnedSlugs = new Set(earnedBadges.map((entry) => entry.badge.slug));
  const nextBadge = BADGE_DEFINITIONS.find((definition) => !earnedSlugs.has(definition.slug));

  return {
    totalPoints: user?.totalPoints ?? 0,
    badges: earnedBadges.map((entry) => ({
      id: entry.id,
      slug: entry.badge.slug,
      name: entry.badge.name,
      description: entry.badge.description,
      icon: entry.badge.icon,
      category: entry.badge.category,
      awardedAt: entry.awardedAt,
    })),
    nextBadge: nextBadge
      ? {
          slug: nextBadge.slug,
          name: nextBadge.name,
          description: nextBadge.description,
          icon: nextBadge.icon,
          category: nextBadge.category,
        }
      : null,
    recentTransactions: transactions.map((transaction) => ({
      id: transaction.id,
      points: transaction.points,
      reason: transaction.reason,
      createdAt: transaction.createdAt,
      note: transaction.note,
    })),
    badgeCatalog: definitions,
  };
}
