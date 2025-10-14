-- Add teacherAnswerComments JSON column to Assignment
ALTER TABLE "Assignment" ADD COLUMN IF NOT EXISTS "teacherAnswerComments" JSONB;
