-- Add a column to preserve the original deadline so we can surface extensions
DO $$
BEGIN
  ALTER TABLE "Assignment"
  ADD COLUMN "originalDeadline" TIMESTAMP;
EXCEPTION
  WHEN undefined_table THEN
    -- Shadow DB might be missing Assignment if older migrations were not replayed.
    NULL;
  WHEN duplicate_column THEN
    -- Column already exists, no-op for idempotency.
    NULL;
END $$;

-- Backfill existing records so historical assignments retain their first deadline
DO $$
BEGIN
  UPDATE "Assignment"
  SET "originalDeadline" = "deadline"
  WHERE "originalDeadline" IS NULL;
EXCEPTION
  WHEN undefined_table THEN
    NULL;
END $$;
