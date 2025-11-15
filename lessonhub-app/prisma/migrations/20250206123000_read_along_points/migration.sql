-- Add read-along point tracking for students
ALTER TABLE "User"
ADD COLUMN "readAlongPoints" INTEGER NOT NULL DEFAULT 0;

-- Track which guides each student has completed
CREATE TABLE "GuideCompletion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "completedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GuideCompletion_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GuideCompletion_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "GuideCompletion_studentId_guideId_key" ON "GuideCompletion"("studentId", "guideId");
