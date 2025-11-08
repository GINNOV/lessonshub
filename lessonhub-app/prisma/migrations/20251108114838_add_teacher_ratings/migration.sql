DO $$
BEGIN
  ALTER TABLE "CouponCode" ALTER COLUMN "updatedAt" DROP DEFAULT;
EXCEPTION
  WHEN undefined_table THEN
    NULL;
END
$$;

-- CreateTable
CREATE TABLE "TeacherRating" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "contentQuality" INTEGER NOT NULL DEFAULT 0,
    "helpfulness" INTEGER NOT NULL DEFAULT 0,
    "communication" INTEGER NOT NULL DEFAULT 0,
    "valueForMoney" INTEGER NOT NULL DEFAULT 0,
    "overall" INTEGER,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeacherRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeacherRating_teacherId_idx" ON "TeacherRating"("teacherId");

-- CreateIndex
CREATE INDEX "TeacherRating_studentId_idx" ON "TeacherRating"("studentId");

-- AddForeignKey
ALTER TABLE "TeacherRating" ADD CONSTRAINT "TeacherRating_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherRating" ADD CONSTRAINT "TeacherRating_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
