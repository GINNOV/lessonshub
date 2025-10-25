-- Added for drift reconciliation: ensure lessons track difficulty (default medium difficulty = 3).
ALTER TABLE "Lesson" ADD COLUMN "difficulty" INTEGER NOT NULL DEFAULT 3;
