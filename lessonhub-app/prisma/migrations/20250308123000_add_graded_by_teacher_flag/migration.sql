-- Track whether a grade was applied by a teacher (vs. auto-marked)
ALTER TABLE "public"."Assignment"
ADD COLUMN "gradedByTeacher" BOOLEAN NOT NULL DEFAULT false;
