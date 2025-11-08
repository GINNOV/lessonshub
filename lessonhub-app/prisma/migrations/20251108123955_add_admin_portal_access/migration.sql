-- Add hasAdminPortalAccess flag to users
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "hasAdminPortalAccess" BOOLEAN NOT NULL DEFAULT false;
