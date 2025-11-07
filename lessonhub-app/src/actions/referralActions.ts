'use server';

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";
import { nanoid } from "nanoid";

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
