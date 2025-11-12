-- Lyric draft storage on assignments
ALTER TABLE "Assignment"
ADD COLUMN "lyricDraftAnswers" JSONB,
ADD COLUMN "lyricDraftMode" TEXT,
ADD COLUMN "lyricDraftReadSwitches" INTEGER,
ADD COLUMN "lyricDraftUpdatedAt" TIMESTAMP;
