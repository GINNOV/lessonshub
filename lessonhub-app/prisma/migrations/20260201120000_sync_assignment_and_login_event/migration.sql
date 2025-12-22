-- Sync Assignment and LoginEvent columns for shadow DB drift and add extraPoints.
DO $$ BEGIN
  ALTER TABLE "Assignment"
  ADD COLUMN IF NOT EXISTS "pastDueWarningSentAt" TIMESTAMP(3);
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Assignment"
  ADD COLUMN IF NOT EXISTS "gradedByTeacher" BOOLEAN NOT NULL DEFAULT false;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Assignment"
  ADD COLUMN IF NOT EXISTS "extraPoints" INTEGER NOT NULL DEFAULT 0;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Assignment"
  ALTER COLUMN "lyricDraftUpdatedAt" SET DATA TYPE TIMESTAMP(3);
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "LoginEvent"
  ALTER COLUMN "id" DROP DEFAULT,
  ALTER COLUMN "createdAt" SET NOT NULL,
  ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;
