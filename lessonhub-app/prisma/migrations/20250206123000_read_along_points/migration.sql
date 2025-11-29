-- Add read-along point tracking for students (safe on shadow DBs missing prior tables)
DO $$
BEGIN
  IF to_regclass('"User"') IS NOT NULL THEN
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "readAlongPoints" INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Track which guides each student has completed (only if User and Lesson exist)
DO $$
BEGIN
  IF to_regclass('"User"') IS NOT NULL AND to_regclass('"Lesson"') IS NOT NULL THEN
    IF to_regclass('"GuideCompletion"') IS NULL THEN
      CREATE TABLE "GuideCompletion" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "studentId" TEXT NOT NULL,
          "guideId" TEXT NOT NULL,
          "completedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "GuideCompletion_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT "GuideCompletion_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
      CREATE UNIQUE INDEX "GuideCompletion_studentId_guideId_key" ON "GuideCompletion"("studentId", "guideId");
    END IF;
  END IF;
END $$;
