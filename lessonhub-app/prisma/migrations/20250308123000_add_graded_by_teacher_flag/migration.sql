-- Track whether a grade was applied by a teacher (vs. auto-marked)
DO $$ BEGIN
  ALTER TABLE "public"."Assignment"
  ADD COLUMN "gradedByTeacher" BOOLEAN NOT NULL DEFAULT false;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;
