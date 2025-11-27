DO $$
BEGIN
  IF to_regclass('"User"') IS NULL THEN
    -- Skip in shadow DBs where the base schema hasn't been created yet.
    RETURN;
  END IF;

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

  -- Ensure FKs exist when the table is present
  IF to_regclass('"GoldStar"') IS NOT NULL THEN
    BEGIN
      ALTER TABLE "GoldStar" ADD CONSTRAINT "GoldStar_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN
      ALTER TABLE "GoldStar" ADD CONSTRAINT "GoldStar_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END;

    BEGIN
      CREATE INDEX "GoldStar_studentId_idx" ON "GoldStar"("studentId");
    EXCEPTION WHEN duplicate_table THEN NULL; END;
    BEGIN
      CREATE INDEX "GoldStar_teacherId_idx" ON "GoldStar"("teacherId");
    EXCEPTION WHEN duplicate_table THEN NULL; END;
  END IF;
END $$;
