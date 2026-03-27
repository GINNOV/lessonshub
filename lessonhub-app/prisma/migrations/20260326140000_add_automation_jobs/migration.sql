CREATE TYPE "AutomationJobKind" AS ENUM ('DAILY_STANDARD_LESSON');

CREATE TYPE "AutomationJobRunStatus" AS ENUM ('PENDING', 'SUCCESS', 'SKIPPED', 'FAILED');

CREATE TABLE "AutomationJob" (
  "id" TEXT NOT NULL,
  "kind" "AutomationJobKind" NOT NULL,
  "name" TEXT NOT NULL,
  "isEnabled" BOOLEAN NOT NULL DEFAULT true,
  "teacherId" TEXT NOT NULL,
  "classId" TEXT NOT NULL,
  "locale" TEXT NOT NULL DEFAULT 'it',
  "price" DECIMAL(65,30) NOT NULL DEFAULT 20,
  "difficulty" INTEGER NOT NULL DEFAULT 3,
  "customPrompt" TEXT,
  "themePool" JSONB,
  "lastRunAt" TIMESTAMP(3),
  "lastStatus" "AutomationJobRunStatus",
  "lastMessage" TEXT,
  "lastLessonId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AutomationJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AutomationJobRun" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "runDate" TIMESTAMP(3) NOT NULL,
  "status" "AutomationJobRunStatus" NOT NULL DEFAULT 'PENDING',
  "message" TEXT,
  "lessonId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AutomationJobRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AutomationJob_isEnabled_kind_idx" ON "AutomationJob"("isEnabled", "kind");
CREATE INDEX "AutomationJob_teacherId_classId_idx" ON "AutomationJob"("teacherId", "classId");
CREATE INDEX "AutomationJobRun_runDate_status_idx" ON "AutomationJobRun"("runDate", "status");
CREATE UNIQUE INDEX "AutomationJobRun_jobId_runDate_key" ON "AutomationJobRun"("jobId", "runDate");

ALTER TABLE "AutomationJob"
ADD CONSTRAINT "AutomationJob_teacherId_fkey"
FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AutomationJob"
ADD CONSTRAINT "AutomationJob_classId_fkey"
FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AutomationJobRun"
ADD CONSTRAINT "AutomationJobRun_jobId_fkey"
FOREIGN KEY ("jobId") REFERENCES "AutomationJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
