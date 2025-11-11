-- Create read-along usage tracking for lyric attempts
ALTER TABLE "LyricLessonAttempt"
ADD COLUMN "readModeSwitchesUsed" INTEGER;
