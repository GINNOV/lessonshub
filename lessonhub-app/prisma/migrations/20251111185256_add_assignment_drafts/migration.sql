-- Ensure draftUpdatedAt exists with TIMESTAMP(3) type (shadow DB safe)
DO $$
BEGIN
  BEGIN
    ALTER TABLE "Assignment" ADD COLUMN IF NOT EXISTS "draftUpdatedAt" TIMESTAMP(3);
  EXCEPTION
    WHEN undefined_table THEN NULL;
  END;

  BEGIN
    ALTER TABLE "Assignment" ALTER COLUMN "draftUpdatedAt" SET DATA TYPE TIMESTAMP(3);
  EXCEPTION
    WHEN undefined_table THEN NULL;
    WHEN undefined_column THEN NULL;
  END;
END $$;
