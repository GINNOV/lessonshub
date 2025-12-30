-- Add maxTries to ComposerLessonConfig
ALTER TABLE "public"."ComposerLessonConfig"
  ADD COLUMN IF NOT EXISTS "maxTries" INTEGER NOT NULL DEFAULT 1;
