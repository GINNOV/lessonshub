DO $$
BEGIN
  ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "guideCardImage" TEXT;
EXCEPTION
  WHEN undefined_table THEN
    -- Lesson table not created yet (runs later in migration chain); skip
    NULL;
END
$$;
