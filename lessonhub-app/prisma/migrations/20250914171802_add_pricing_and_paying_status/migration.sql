-- AlterTable
ALTER TABLE "public"."Lesson" ADD COLUMN     "price" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "isPaying" BOOLEAN NOT NULL DEFAULT false;
