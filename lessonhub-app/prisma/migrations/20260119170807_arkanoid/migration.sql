-- AlterEnum
ALTER TYPE "LessonType" ADD VALUE 'ARKANING';

-- CreateTable
CREATE TABLE "ArkaningLessonConfig" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "questionBank" JSONB NOT NULL,
    "roundsPerCorrect" INTEGER NOT NULL DEFAULT 3,
    "pointsPerCorrect" INTEGER NOT NULL DEFAULT 10,
    "eurosPerCorrect" INTEGER NOT NULL DEFAULT 5,
    "lives" INTEGER NOT NULL DEFAULT 5,
    "loseLifeOnWrong" BOOLEAN NOT NULL DEFAULT true,
    "wrongsPerLife" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArkaningLessonConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ArkaningLessonConfig_lessonId_key" ON "ArkaningLessonConfig"("lessonId");

-- AddForeignKey
ALTER TABLE "ArkaningLessonConfig" ADD CONSTRAINT "ArkaningLessonConfig_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
