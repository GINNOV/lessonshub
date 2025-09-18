-- CreateTable
CREATE TABLE "public"."TeachersForStudent" (
    "studentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,

    CONSTRAINT "TeachersForStudent_pkey" PRIMARY KEY ("studentId","teacherId")
);

-- AddForeignKey
ALTER TABLE "public"."TeachersForStudent" ADD CONSTRAINT "TeachersForStudent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeachersForStudent" ADD CONSTRAINT "TeachersForStudent_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
