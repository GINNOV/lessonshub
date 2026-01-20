-- AlterEnum
ALTER TYPE "PointReason" ADD VALUE 'ARKANING_GAME';

-- AlterTable
ALTER TABLE "PointTransaction" ADD COLUMN     "amountEuro" DECIMAL(65,30);
