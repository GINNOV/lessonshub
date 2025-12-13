-- Add a timestamp to track when we warned students about overdue assignments
ALTER TABLE "public"."Assignment"
ADD COLUMN "pastDueWarningSentAt" TIMESTAMP(3);
