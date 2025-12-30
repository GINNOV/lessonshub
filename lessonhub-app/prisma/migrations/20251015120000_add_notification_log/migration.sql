-- Create NotificationLog table for email debug tracking
CREATE TYPE "NotificationStatus" AS ENUM ('SENT', 'FAILED');

CREATE TABLE "public"."NotificationLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "templateName" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL,
    "errorMessage" TEXT,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "NotificationLog_createdAt_idx" ON "public"."NotificationLog"("createdAt");
