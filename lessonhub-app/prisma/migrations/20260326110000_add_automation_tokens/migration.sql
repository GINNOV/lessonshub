CREATE TABLE "AutomationToken" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "tokenPrefix" TEXT NOT NULL,
  "label" TEXT,
  "ownerId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "lastUsedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AutomationToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AutomationToken_tokenHash_key" ON "AutomationToken"("tokenHash");
CREATE INDEX "AutomationToken_ownerId_revokedAt_idx" ON "AutomationToken"("ownerId", "revokedAt");

ALTER TABLE "AutomationToken"
ADD CONSTRAINT "AutomationToken_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AutomationToken"
ADD CONSTRAINT "AutomationToken_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
