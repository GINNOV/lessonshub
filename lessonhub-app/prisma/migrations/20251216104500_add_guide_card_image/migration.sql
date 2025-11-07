DO $$
BEGIN
  ALTER TABLE "Lesson"
    ADD COLUMN "guideCardImage" TEXT;
EXCEPTION
  WHEN duplicate_column THEN
    NULL;
END
$$;
