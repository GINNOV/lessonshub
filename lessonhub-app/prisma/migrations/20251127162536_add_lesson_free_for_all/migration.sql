-- Make lessons optionally free for all students (regardless of plan)
ALTER TABLE "Lesson" ADD COLUMN "isFreeForAll" BOOLEAN NOT NULL DEFAULT false;
