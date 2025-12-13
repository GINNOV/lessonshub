-- CreateTable
CREATE TABLE "StudentBanner" (
    "id" TEXT NOT NULL,
    "kicker" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "ctaText" TEXT NOT NULL,
    "ctaHref" TEXT NOT NULL DEFAULT '/profile?tab=status',
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentBanner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentBanner_isActive_idx" ON "StudentBanner"("isActive");
