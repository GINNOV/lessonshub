DO $$
BEGIN
  IF to_regclass('public."InstructionBooklet"') IS NOT NULL THEN
    -- Drop the legacy index if it still exists
    IF EXISTS (
      SELECT 1
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = 'InstructionBooklet_teacherId_idx'
    ) THEN
      EXECUTE 'DROP INDEX "public"."InstructionBooklet_teacherId_idx"';
    END IF;

    -- Ensure timestamp precision matches the Prisma schema
    EXECUTE 'ALTER TABLE "InstructionBooklet"
      ALTER COLUMN "createdAt" TYPE TIMESTAMP(3),
      ALTER COLUMN "updatedAt" DROP DEFAULT,
      ALTER COLUMN "updatedAt" TYPE TIMESTAMP(3)';
  END IF;
END $$;
