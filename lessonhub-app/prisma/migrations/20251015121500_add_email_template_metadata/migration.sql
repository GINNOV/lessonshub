-- Add description/category metadata to email templates
ALTER TABLE "public"."EmailTemplate"
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "category" TEXT;
