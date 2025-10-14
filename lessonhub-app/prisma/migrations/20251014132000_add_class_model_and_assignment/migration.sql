-- Create Class table
CREATE TABLE "public"."Class" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "teacherId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Class_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Class_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Add optional classId to TeachersForStudent
ALTER TABLE "public"."TeachersForStudent" ADD COLUMN "classId" TEXT;
ALTER TABLE "public"."TeachersForStudent"
  ADD CONSTRAINT "TeachersForStudent_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "public"."Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;
