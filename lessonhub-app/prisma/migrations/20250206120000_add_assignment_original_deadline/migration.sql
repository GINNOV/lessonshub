-- Add a column to preserve the original deadline so we can surface extensions
ALTER TABLE "Assignment"
ADD COLUMN "originalDeadline" TIMESTAMP;

-- Backfill existing records so historical assignments retain their first deadline
UPDATE "Assignment"
SET "originalDeadline" = "deadline"
WHERE "originalDeadline" IS NULL;
