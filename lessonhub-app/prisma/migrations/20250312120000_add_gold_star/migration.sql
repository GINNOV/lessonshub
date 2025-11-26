-- CreateTable
CREATE TABLE "GoldStar" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "message" TEXT,
    "amountEuro" INTEGER NOT NULL DEFAULT 200,
    "points" INTEGER NOT NULL DEFAULT 11,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GoldStar_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "GoldStar" ADD CONSTRAINT "GoldStar_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoldStar" ADD CONSTRAINT "GoldStar_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "GoldStar_studentId_idx" ON "GoldStar"("studentId");
CREATE INDEX "GoldStar_teacherId_idx" ON "GoldStar"("teacherId");
