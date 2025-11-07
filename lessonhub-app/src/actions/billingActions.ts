'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';

type RedeemResult = {
  success: boolean;
  message?: string;
  error?: string;
};

class RedeemError extends Error {
  constructor(public reason: string) {
    super(reason);
  }
}

function normalizeCode(value: string) {
  return value.trim().toUpperCase();
}

export async function redeemCoupon(rawCode: string): Promise<RedeemResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'You must be signed in.' };
  }

  const code = normalizeCode(rawCode || '');
  if (!code) {
    return { success: false, error: 'Enter a coupon code first.' };
  }

  try {
    const { description } = await prisma.$transaction(async (tx) => {
      const coupon = await tx.couponCode.findUnique({ where: { code } });
      if (!coupon) {
        throw new RedeemError('That code was not recognized. Please double-check and try again.');
      }
      if (!coupon.isActive) {
        throw new RedeemError('This code is no longer active.');
      }
      if (coupon.expiresAt && coupon.expiresAt < new Date()) {
        throw new RedeemError('This code has expired.');
      }
      if (coupon.redemptionCount >= coupon.maxRedemptions) {
        throw new RedeemError('This code has already been fully redeemed.');
      }

      const existing = await tx.couponRedemption.findFirst({
        where: { couponId: coupon.id, userId: session.user.id },
      });
      if (existing) {
        throw new RedeemError('You have already redeemed this code.');
      }

      await tx.couponRedemption.create({
        data: {
          couponId: coupon.id,
          userId: session.user.id,
        },
      });

      await tx.couponCode.update({
        where: { id: coupon.id },
        data: { redemptionCount: { increment: 1 } },
      });

      await tx.user.update({
        where: { id: session.user.id },
        data: { isPaying: true },
      });

      return { description: coupon.description ?? undefined };
    });

    const successMessage = description
      ? `Coupon applied: ${description}`
      : 'Coupon applied successfully. Enjoy full access!';

    return { success: true, message: successMessage };
  } catch (error) {
    if (error instanceof RedeemError) {
      return { success: false, error: error.reason };
    }
    console.error('Failed to redeem coupon:', error);
    return { success: false, error: 'Something went wrong while redeeming the code.' };
  }
}
