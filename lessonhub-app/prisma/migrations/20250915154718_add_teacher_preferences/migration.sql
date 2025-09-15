-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "defaultLessonInstructions" TEXT,
ADD COLUMN     "defaultLessonNotes" TEXT,
ADD COLUMN     "defaultLessonPreview" TEXT,
ADD COLUMN     "defaultLessonPrice" DECIMAL(65,30);
