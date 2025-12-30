-- DropIndex
DROP INDEX "NotificationLog_createdAt_idx";

-- DropIndex
DROP INDEX "StudentBanner_isActive_idx";

-- CreateTable
CREATE TABLE "AppConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "geminiApiKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppConfig_pkey" PRIMARY KEY ("id")
);
