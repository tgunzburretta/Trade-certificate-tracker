-- AlterTable
ALTER TABLE "Company" ADD COLUMN "companyNumber" TEXT;
ALTER TABLE "Company" ADD COLUMN "registeredAddress" TEXT;
ALTER TABLE "Company" ADD COLUMN "registeredName" TEXT;

-- CreateTable
CREATE TABLE "CompanyVerification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "detail" TEXT,
    "reference" TEXT,
    "payload" TEXT,
    "checkedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompanyVerification_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CompanyVerification_companyId_source_checkedAt_idx" ON "CompanyVerification"("companyId", "source", "checkedAt");
