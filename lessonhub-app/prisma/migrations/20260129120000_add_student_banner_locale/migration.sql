-- Add locale scoping for student banners
ALTER TABLE "public"."StudentBanner"
ADD COLUMN "locale" TEXT;
