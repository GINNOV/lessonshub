-- Add referral reward settings to user table
ALTER TABLE "public"."User"
ADD COLUMN "referralRewardPercent" DECIMAL(65,30) NOT NULL DEFAULT 35,
ADD COLUMN "referralRewardMonthlyAmount" DECIMAL(65,30) NOT NULL DEFAULT 100;
