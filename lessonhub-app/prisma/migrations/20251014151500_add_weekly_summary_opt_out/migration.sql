-- Add weeklySummaryOptOut flag to User (default false)
ALTER TABLE "public"."User" ADD COLUMN IF NOT EXISTS "weeklySummaryOptOut" BOOLEAN NOT NULL DEFAULT false;
