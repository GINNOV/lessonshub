'use server';

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";
import { nanoid } from "nanoid";
import { hasAdminPrivileges } from "@/lib/authz";

interface ReferralSummary {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  isPaying: boolean;
  lastSeen: Date | null;
  isSuspended: boolean;
  isTakingBreak: boolean;
}

interface ReferralLeaderboardRow {
  id: string;
  name: string | null;
  email: string;
  totalReferrals: number;
  payingReferrals: number;
}

export interface ReferralDashboardData {
  viewer: {
    id: string;
    name: string | null;
    email: string;
    role: Role;
    referralCode: string;
  };
  stats: {
    totalReferrals: number;
    payingReferrals: number;
    pausedReferrals: number;
  };
  referrals: ReferralSummary[];
  leaderboard: ReferralLeaderboardRow[];
  reward: {
    percent: number;
    monthlyAmount: number;
    monthlySharePerReferral: number;
    estimatedMonthlyReward: number;
  };
}

export interface AdminReferralSummaryRow {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  totalReferrals: number;
  payingReferrals: number;
  pausedReferrals: number;
  estimatedMonthlyReward: number;
}

export interface AdminReferralSummaryData {
  stats: {
    referrers: number;
    totalReferrals: number;
    payingReferrals: number;
    pausedReferrals: number;
    estimatedMonthlyPayout: number;
    monthlySharePerReferral: number;
    rewardPercent: number;
    rewardMonthlyAmount: number;
  };
  referrers: AdminReferralSummaryRow[];
  referrals: (ReferralSummary & {
    referrerName: string | null;
    referrerEmail: string;
  })[];
}

export async function getReferralDashboardData(): Promise<ReferralDashboardData> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const [viewerRecord, referralSettings] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        referralCode: true,
      },
    }),
    prisma.user.findFirst({
      where: { role: Role.ADMIN },
      select: {
        referralRewardPercent: true,
        referralRewardMonthlyAmount: true,
      },
    }),
  ]);

  if (!viewerRecord) {
    throw new Error("User not found");
  }

  let referralCode = viewerRecord.referralCode;

  if (!referralCode) {
    referralCode = nanoid(8);
    await prisma.user.update({
      where: { id: viewerRecord.id },
      data: { referralCode },
    });
  }

  const referrals = await prisma.user.findMany({
    where: { referrerId: viewerRecord.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isPaying: true,
      lastSeen: true,
      isSuspended: true,
      isTakingBreak: true,
    },
    orderBy: [
      { isPaying: "desc" },
      { name: "asc" },
    ],
  });

  const rewardPercent = referralSettings
    ? referralSettings.referralRewardPercent.toNumber()
    : 35;
  const rewardMonthlyAmount = referralSettings
    ? referralSettings.referralRewardMonthlyAmount.toNumber()
    : 100;
  const monthlySharePerReferral = rewardMonthlyAmount * (rewardPercent / 100);

  const totalReferrals = referrals.length;
  const payingReferrals = referrals.filter((referral) => referral.isPaying).length;
  const pausedReferrals = referrals.filter((referral) => referral.isTakingBreak).length;

  let leaderboard: ReferralLeaderboardRow[] = [];

  if (viewerRecord.role === Role.TEACHER || viewerRecord.role === Role.ADMIN) {
    const leaderboardRecords = await prisma.user.findMany({
      where: {
        referrals: { some: {} },
        role: Role.STUDENT,
      },
      select: {
        id: true,
        name: true,
        email: true,
        referrals: {
          select: {
            id: true,
            isPaying: true,
          },
        },
      },
      orderBy: {
        referrals: {
          _count: "desc",
        },
      },
      take: 10,
    });

    leaderboard = leaderboardRecords.map((record) => ({
      id: record.id,
      name: record.name,
      email: record.email,
      totalReferrals: record.referrals.length,
      payingReferrals: record.referrals.filter((referral) => referral.isPaying).length,
    }));
  }

  return {
    viewer: {
      ...viewerRecord,
      referralCode,
    },
    stats: {
      totalReferrals,
      payingReferrals,
      pausedReferrals,
    },
    referrals,
    leaderboard,
    reward: {
      percent: rewardPercent,
      monthlyAmount: rewardMonthlyAmount,
      monthlySharePerReferral: monthlySharePerReferral,
      estimatedMonthlyReward: payingReferrals * monthlySharePerReferral,
    },
  };
}

export async function getAdminReferralSummaryData(): Promise<AdminReferralSummaryData> {
  const session = await auth();
  if (!hasAdminPrivileges(session?.user)) {
    throw new Error("Unauthorized");
  }

  const referralSettings = await prisma.user.findFirst({
    where: { role: Role.ADMIN },
    select: {
      referralRewardPercent: true,
      referralRewardMonthlyAmount: true,
    },
  });

  const rewardPercent = referralSettings
    ? referralSettings.referralRewardPercent.toNumber()
    : 35;
  const rewardMonthlyAmount = referralSettings
    ? referralSettings.referralRewardMonthlyAmount.toNumber()
    : 100;
  const monthlySharePerReferral = rewardMonthlyAmount * (rewardPercent / 100);

  const referrerRecords = await prisma.user.findMany({
    where: { referrals: { some: {} } },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      referrals: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isPaying: true,
          lastSeen: true,
          isSuspended: true,
          isTakingBreak: true,
        },
      },
    },
    orderBy: {
      referrals: {
        _count: "desc",
      },
    },
  });

  const referrers: AdminReferralSummaryRow[] = referrerRecords.map((record) => {
    const totalReferrals = record.referrals.length;
    const payingReferrals = record.referrals.filter((referral) => referral.isPaying).length;
    const pausedReferrals = record.referrals.filter((referral) => referral.isTakingBreak).length;

    return {
      id: record.id,
      name: record.name,
      email: record.email,
      role: record.role,
      totalReferrals,
      payingReferrals,
      pausedReferrals,
      estimatedMonthlyReward: payingReferrals * monthlySharePerReferral,
    };
  });

  const flattenedReferrals = referrerRecords.flatMap((referrer) =>
    referrer.referrals.map((referral) => ({
      id: referral.id,
      name: referral.name,
      email: referral.email,
      role: referral.role,
      isPaying: referral.isPaying,
      lastSeen: referral.lastSeen,
      isSuspended: referral.isSuspended,
      isTakingBreak: referral.isTakingBreak,
      referrerName: referrer.name,
      referrerEmail: referrer.email,
    }))
  );

  const totals = referrers.reduce(
    (acc, referrer) => {
      acc.referrers += 1;
      acc.totalReferrals += referrer.totalReferrals;
      acc.payingReferrals += referrer.payingReferrals;
      acc.pausedReferrals += referrer.pausedReferrals;
      return acc;
    },
    { referrers: 0, totalReferrals: 0, payingReferrals: 0, pausedReferrals: 0 }
  );

  return {
    stats: {
      ...totals,
      estimatedMonthlyPayout: totals.payingReferrals * monthlySharePerReferral,
      monthlySharePerReferral,
      rewardPercent,
      rewardMonthlyAmount,
    },
    referrers,
    referrals: flattenedReferrals,
  };
}
