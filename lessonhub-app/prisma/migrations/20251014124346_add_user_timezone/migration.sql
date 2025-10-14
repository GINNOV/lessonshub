-- Add timeZone to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "timeZone" TEXT;
