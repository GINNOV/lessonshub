-- Add draft support fields for assignments
ALTER TABLE "Assignment"
ADD COLUMN "draftAnswers" JSONB,
ADD COLUMN "draftStudentNotes" TEXT,
ADD COLUMN "draftRating" INTEGER,
ADD COLUMN "draftUpdatedAt" TIMESTAMP;
