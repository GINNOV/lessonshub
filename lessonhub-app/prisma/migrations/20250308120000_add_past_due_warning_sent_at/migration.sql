-- Add a timestamp to track when we warned students about overdue assignments
DO $$ BEGIN
  ALTER TABLE "public"."Assignment"
  ADD COLUMN "pastDueWarningSentAt" TIMESTAMP(3);
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;
