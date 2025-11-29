-- Ensure schema objects exist even when previous migrations were guarded.
-- Uses IF NOT EXISTS so production DB is not altered when objects already exist.

-- Assignment.originalDeadline
DO $$
BEGIN
  BEGIN
    ALTER TABLE "Assignment" ADD COLUMN IF NOT EXISTS "originalDeadline" TIMESTAMP;
  EXCEPTION WHEN undefined_table THEN NULL; END;
END $$;

-- User.readAlongPoints
DO $$
BEGIN
  BEGIN
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "readAlongPoints" INTEGER NOT NULL DEFAULT 0;
  EXCEPTION WHEN undefined_table THEN NULL; END;
END $$;

-- GuideCompletion table + constraints
CREATE TABLE IF NOT EXISTS "GuideCompletion" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "studentId" TEXT NOT NULL,
  "guideId" TEXT NOT NULL,
  "completedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  BEGIN
    ALTER TABLE "GuideCompletion" ADD CONSTRAINT "GuideCompletion_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION
    WHEN undefined_table THEN NULL;
    WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER TABLE "GuideCompletion" ADD CONSTRAINT "GuideCompletion_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION
    WHEN undefined_table THEN NULL;
    WHEN duplicate_object THEN NULL;
  END;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "GuideCompletion_studentId_guideId_key" ON "GuideCompletion"("studentId", "guideId");

-- GoldStar table + constraints
CREATE TABLE IF NOT EXISTS "GoldStar" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "message" TEXT,
  "amountEuro" INTEGER NOT NULL DEFAULT 200,
  "points" INTEGER NOT NULL DEFAULT 11,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GoldStar_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  BEGIN
    ALTER TABLE "GoldStar" ADD CONSTRAINT "GoldStar_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION
    WHEN undefined_table THEN NULL;
    WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER TABLE "GoldStar" ADD CONSTRAINT "GoldStar_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION
    WHEN undefined_table THEN NULL;
    WHEN duplicate_object THEN NULL;
  END;
END $$;

CREATE INDEX IF NOT EXISTS "GoldStar_studentId_idx" ON "GoldStar"("studentId");
CREATE INDEX IF NOT EXISTS "GoldStar_teacherId_idx" ON "GoldStar"("teacherId");
