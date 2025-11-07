-- CreateTable
CREATE TABLE "LearningSessionCard" (
    "id" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "content1" TEXT NOT NULL,
    "content2" TEXT NOT NULL,
    "content3" TEXT,
    "content4" TEXT,
    "extra" TEXT,
    "lessonId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LearningSessionCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LearningSessionCard_lessonId_idx" ON "LearningSessionCard"("lessonId");

-- AddForeignKey
ALTER TABLE "LearningSessionCard"
ADD CONSTRAINT "LearningSessionCard_lessonId_fkey"
FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
