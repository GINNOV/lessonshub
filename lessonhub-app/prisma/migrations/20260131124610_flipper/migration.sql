-- AlterEnum
ALTER TYPE "LessonType" ADD VALUE 'FLIPPER';

-- AlterEnum
ALTER TYPE "PointReason" ADD VALUE 'FLIPPER_MATCH';

-- CreateTable
CREATE TABLE "FlipperLessonConfig" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "attemptsBeforePenalty" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlipperLessonConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlipperTile" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlipperTile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FlipperLessonConfig_lessonId_key" ON "FlipperLessonConfig"("lessonId");

-- CreateIndex
CREATE INDEX "FlipperTile_lessonId_idx" ON "FlipperTile"("lessonId");

-- AddForeignKey
ALTER TABLE "FlipperLessonConfig" ADD CONSTRAINT "FlipperLessonConfig_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlipperTile" ADD CONSTRAINT "FlipperTile_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
