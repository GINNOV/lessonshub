-- Add COMPOSER lesson type
DO $$ BEGIN
  ALTER TYPE "LessonType" ADD VALUE 'COMPOSER';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create ComposerLessonConfig
CREATE TABLE IF NOT EXISTS "public"."ComposerLessonConfig" (
  "id" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "hiddenSentence" TEXT NOT NULL,
  "questionBank" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ComposerLessonConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ComposerLessonConfig_lessonId_key" ON "public"."ComposerLessonConfig"("lessonId");

ALTER TABLE "public"."ComposerLessonConfig"
  ADD CONSTRAINT "ComposerLessonConfig_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "public"."Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
