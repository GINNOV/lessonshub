-- AlterTable
DO $$ BEGIN
  ALTER TABLE "NewsArticleLessonConfig"
    ALTER COLUMN "id" DROP DEFAULT,
    ALTER COLUMN "updatedAt" DROP DEFAULT;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;
