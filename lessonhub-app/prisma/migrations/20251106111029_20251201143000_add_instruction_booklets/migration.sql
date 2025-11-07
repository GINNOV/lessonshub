-- DropIndex
DROP INDEX IF EXISTS "public"."InstructionBooklet_teacherId_idx";

-- AlterTable
DO $$
BEGIN
  IF to_regclass('public."InstructionBooklet"') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE "InstructionBooklet"
      ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
      ALTER COLUMN "updatedAt" DROP DEFAULT,
      ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3)';
  END IF;
END $$;
