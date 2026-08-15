-- CreateEnum
CREATE TYPE "DataSource" AS ENUM ('MANUFACTURER_SPEC', 'RETAILER_LISTING', 'DATA_FEED', 'COMMUNITY', 'ESTIMATED', 'UNVERIFIED');

-- AlterTable
ALTER TABLE "Part" ADD COLUMN     "dataNotes" TEXT,
ADD COLUMN     "dataSource" "DataSource" NOT NULL DEFAULT 'UNVERIFIED',
ADD COLUMN     "sourceUrl" TEXT,
ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedBy" TEXT;

-- CreateIndex
CREATE INDEX "Part_dataSource_idx" ON "Part"("dataSource");

