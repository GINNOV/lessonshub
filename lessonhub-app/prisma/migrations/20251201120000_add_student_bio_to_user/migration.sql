-- Add student bio so learners can showcase personal info on leaderboard profiles
ALTER TABLE "User"
ADD COLUMN     "studentBio" TEXT;
