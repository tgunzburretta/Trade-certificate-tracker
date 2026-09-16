-- CreateTable
CREATE TABLE "Contractor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "planStatus" TEXT NOT NULL DEFAULT 'TRIAL',
    "trialEndsAt" DATETIME NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "WatchedSub" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contractorId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "shareSlug" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WatchedSub_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Contractor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Company" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "shareSlug" TEXT NOT NULL,
    "planStatus" TEXT NOT NULL DEFAULT 'TRIAL',
    "planTier" TEXT NOT NULL DEFAULT 'CREW',
    "trialEndsAt" DATETIME NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Company" ("createdAt", "id", "name", "planStatus", "shareSlug", "stripeCustomerId", "stripeSubscriptionId", "trialEndsAt", "updatedAt") SELECT "createdAt", "id", "name", "planStatus", "shareSlug", "stripeCustomerId", "stripeSubscriptionId", "trialEndsAt", "updatedAt" FROM "Company";
DROP TABLE "Company";
ALTER TABLE "new_Company" RENAME TO "Company";
CREATE UNIQUE INDEX "Company_shareSlug_key" ON "Company"("shareSlug");
CREATE UNIQUE INDEX "Company_stripeCustomerId_key" ON "Company"("stripeCustomerId");
CREATE UNIQUE INDEX "Company_stripeSubscriptionId_key" ON "Company"("stripeSubscriptionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Contractor_email_key" ON "Contractor"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Contractor_stripeCustomerId_key" ON "Contractor"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Contractor_stripeSubscriptionId_key" ON "Contractor"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "WatchedSub_contractorId_idx" ON "WatchedSub"("contractorId");

-- CreateIndex
CREATE UNIQUE INDEX "WatchedSub_contractorId_shareSlug_key" ON "WatchedSub"("contractorId", "shareSlug");
