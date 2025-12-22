/*
  Warnings:

  - Made the column `createdAt` on table `LoginEvent` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
DO $$ BEGIN
  ALTER TABLE "Assignment" ALTER COLUMN "originalDeadline" SET DATA TYPE TIMESTAMP(3);
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Assignment" ALTER COLUMN "lyricDraftUpdatedAt" SET DATA TYPE TIMESTAMP(3);
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
END $$;

-- AlterTable
DO $$ BEGIN
  ALTER TABLE "GuideCompletion" ALTER COLUMN "completedAt" SET DATA TYPE TIMESTAMP(3);
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

-- AlterTable
DO $$ BEGIN
  ALTER TABLE "LoginEvent" ALTER COLUMN "id" DROP DEFAULT,
  ALTER COLUMN "createdAt" SET NOT NULL,
  ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;
