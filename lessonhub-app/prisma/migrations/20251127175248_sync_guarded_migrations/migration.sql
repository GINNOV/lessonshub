/*
  Warnings:

  - Made the column `createdAt` on table `LoginEvent` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Assignment" ALTER COLUMN "originalDeadline" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "lyricDraftUpdatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "GuideCompletion" ALTER COLUMN "completedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "LoginEvent" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "createdAt" SET NOT NULL,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);
