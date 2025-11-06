-- DropIndex
DROP INDEX "public"."InstructionBooklet_teacherId_idx";

-- AlterTable
ALTER TABLE "InstructionBooklet" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);
