-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "assignmentSummaryFooter" TEXT,
ADD COLUMN     "progressCardBody" TEXT DEFAULT 'Total value from all graded lessons.',
ADD COLUMN     "progressCardLinkText" TEXT DEFAULT 'Invest in your future - watch now',
ADD COLUMN     "progressCardTitle" TEXT DEFAULT 'My Progress';
