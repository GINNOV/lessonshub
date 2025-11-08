'use server';

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function getCouponDashboardData() {
  await requireAdmin();

  const coupons = await prisma.couponCode.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      redemptions: {
        select: {
          id: true,
        },
      },
    },
  });

  const data = coupons.map((coupon) => ({
    id: coupon.id,
    code: coupon.code,
    description: coupon.description,
    maxRedemptions: coupon.maxRedemptions,
    redemptionCount: coupon.redemptionCount,
    isActive: coupon.isActive,
    expiresAt: coupon.expiresAt ? coupon.expiresAt.toISOString() : null,
    createdAt: coupon.createdAt.toISOString(),
  }));

  const totals = {
    active: data.filter((coupon) => coupon.isActive).length,
    expiringSoon: data.filter(
      (coupon) =>
        coupon.expiresAt &&
        new Date(coupon.expiresAt).getTime() < Date.now() + 7 * 24 * 60 * 60 * 1000
    ).length,
    totalRedemptions: data.reduce((sum, coupon) => sum + coupon.redemptionCount, 0),
  };

  return { coupons: data, totals };
}

export async function createCouponAction(formData: FormData) {
  await requireAdmin();

  const code = String(formData.get("code") || "").trim().toUpperCase();
  const description = String(formData.get("description") || "").trim() || null;
  const maxRedemptions = Number(formData.get("maxRedemptions") || 1);
  const expiresAtRaw = String(formData.get("expiresAt") || "").trim();

  if (!code) {
    throw new Error("Coupon code is required.");
  }

  const expiresAt = expiresAtRaw ? new Date(expiresAtRaw) : null;

  await prisma.couponCode.create({
    data: {
      code,
      description,
      maxRedemptions: Number.isNaN(maxRedemptions) || maxRedemptions <= 0 ? 1 : maxRedemptions,
      expiresAt,
    },
  });

  revalidatePath("/admin/coupons");
}

export async function toggleCouponStatusAction(formData: FormData) {
  await requireAdmin();
  const couponId = String(formData.get("couponId") || "");
  const nextStatus = formData.get("nextStatus") === "true";

  if (!couponId) {
    throw new Error("Coupon id missing.");
  }

  await prisma.couponCode.update({
    where: { id: couponId },
    data: { isActive: nextStatus },
  });

  revalidatePath("/admin/coupons");
}

export async function deleteCouponAction(formData: FormData) {
  await requireAdmin();
  const couponId = String(formData.get("couponId") || "");
  if (!couponId) {
    throw new Error("Coupon id missing.");
  }

  await prisma.couponCode.delete({
    where: { id: couponId },
  });

  revalidatePath("/admin/coupons");
}
