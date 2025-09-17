/*
  Warnings:

  - You are about to drop the column `imageUrl` on the `Flashcard` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Flashcard" DROP COLUMN "imageUrl",
ADD COLUMN     "definitionImageUrl" TEXT,
ADD COLUMN     "termImageUrl" TEXT;
