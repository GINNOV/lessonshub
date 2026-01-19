-- Add lessonAutoSaveOptOut flag to users
ALTER TABLE "public"."User"
ADD COLUMN IF NOT EXISTS "lessonAutoSaveOptOut" BOOLEAN NOT NULL DEFAULT false;
