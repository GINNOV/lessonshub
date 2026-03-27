-- AlterTable
ALTER TABLE "AutomationJob" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "AutomationJobRun" ALTER COLUMN "updatedAt" DROP DEFAULT;
