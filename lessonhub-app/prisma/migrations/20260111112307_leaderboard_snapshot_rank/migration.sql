/*
  Warnings:

  - Added the required column `rank` to the `LeaderboardSnapshot` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "LeaderboardSnapshot" ADD COLUMN     "rank" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "LeaderboardSnapshot_rank_idx" ON "LeaderboardSnapshot"("rank");
