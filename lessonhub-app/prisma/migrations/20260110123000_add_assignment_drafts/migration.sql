DO $$
BEGIN
  IF to_regclass('"Assignment"') IS NULL THEN
    RETURN;
  END IF;

  ALTER TABLE "Assignment"
  ADD COLUMN IF NOT EXISTS "draftAnswers" JSONB,
  ADD COLUMN IF NOT EXISTS "draftStudentNotes" TEXT,
  ADD COLUMN IF NOT EXISTS "draftRating" INTEGER,
  ADD COLUMN IF NOT EXISTS "draftUpdatedAt" TIMESTAMP;
END $$;
