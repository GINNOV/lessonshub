-- AlterEnum
ALTER TYPE "LessonType" ADD VALUE 'LYRIC';

-- CreateTable
CREATE TABLE "LyricLessonConfig" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "audioUrl" TEXT NOT NULL,
    "audioStorageKey" TEXT,
    "rawLyrics" TEXT NOT NULL,
    "lines" JSONB NOT NULL,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LyricLessonConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LyricLessonAttempt" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "scorePercent" DECIMAL(65,30),
    "timeTakenSeconds" INTEGER,
    "answers" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LyricLessonAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LyricLessonConfig_lessonId_key" ON "LyricLessonConfig"("lessonId");

-- CreateIndex
CREATE INDEX "LyricLessonAttempt_lessonId_idx" ON "LyricLessonAttempt"("lessonId");

-- CreateIndex
CREATE INDEX "LyricLessonAttempt_studentId_idx" ON "LyricLessonAttempt"("studentId");

-- AddForeignKey
ALTER TABLE "LyricLessonConfig" ADD CONSTRAINT "LyricLessonConfig_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LyricLessonAttempt" ADD CONSTRAINT "LyricLessonAttempt_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LyricLessonAttempt" ADD CONSTRAINT "LyricLessonAttempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
