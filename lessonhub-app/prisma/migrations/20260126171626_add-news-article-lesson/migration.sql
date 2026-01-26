-- Manual migration to align local history with the already-applied Neon changes.
ALTER TYPE "LessonType" ADD VALUE IF NOT EXISTS 'NEWS_ARTICLE';
ALTER TYPE "PointReason" ADD VALUE IF NOT EXISTS 'NEWS_ARTICLE_TAP';

CREATE TABLE IF NOT EXISTS "NewsArticleLessonConfig" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "lessonId" TEXT NOT NULL,
  "markdown" TEXT NOT NULL,
  "maxWordTaps" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NewsArticleLessonConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "NewsArticleLessonConfig_lessonId_key" ON "NewsArticleLessonConfig"("lessonId");

ALTER TABLE "NewsArticleLessonConfig"
  ADD CONSTRAINT "NewsArticleLessonConfig_lessonId_fkey"
  FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Assignment"
  ADD COLUMN IF NOT EXISTS "newsArticleTapCount" INTEGER NOT NULL DEFAULT 0;
