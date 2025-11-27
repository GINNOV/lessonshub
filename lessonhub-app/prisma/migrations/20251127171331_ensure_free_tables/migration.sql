-- Safety migration to ensure tables/columns skipped in earlier guarded migrations are present

DO $$
BEGIN
  IF to_regclass('"User"') IS NOT NULL THEN
    -- readAlongPoints column
    BEGIN
      PERFORM 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'readAlongPoints';
      IF NOT FOUND THEN
        ALTER TABLE "User" ADD COLUMN "readAlongPoints" INTEGER NOT NULL DEFAULT 0;
      END IF;
    EXCEPTION WHEN undefined_table THEN NULL; END;
  END IF;
END $$;

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

DO $$
BEGIN
  IF to_regclass('"User"') IS NOT NULL THEN
    IF to_regclass('"GoldStar"') IS NULL THEN
      CREATE TABLE "GoldStar" (
          "id" TEXT NOT NULL,
          "studentId" TEXT NOT NULL,
          "teacherId" TEXT NOT NULL,
          "message" TEXT,
          "amountEuro" INTEGER NOT NULL DEFAULT 200,
          "points" INTEGER NOT NULL DEFAULT 11,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "GoldStar_pkey" PRIMARY KEY ("id")
      );
    END IF;

    IF to_regclass('"GoldStar"') IS NOT NULL THEN
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
      BEGIN
        CREATE INDEX "GoldStar_studentId_idx" ON "GoldStar"("studentId");
      EXCEPTION
        WHEN undefined_table THEN NULL;
        WHEN duplicate_table THEN NULL;
      END;
      BEGIN
        CREATE INDEX "GoldStar_teacherId_idx" ON "GoldStar"("teacherId");
      EXCEPTION
        WHEN undefined_table THEN NULL;
        WHEN duplicate_table THEN NULL;
      END;
    END IF;
  END IF;
END $$;
