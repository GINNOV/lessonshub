-- Add Gender enum and gender column to User
DO $$ BEGIN
  CREATE TYPE "public"."Gender" AS ENUM ('MALE','FEMALE','BINARY');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "public"."User" ADD COLUMN IF NOT EXISTS "gender" "public"."Gender" NOT NULL DEFAULT 'BINARY';
