-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('GBP');

-- AlterEnum
BEGIN;
CREATE TYPE "FrameMaterial_new" AS ENUM ('CARBON', 'ALUMINIUM', 'STEEL', 'TITANIUM');
ALTER TABLE "Frame" ALTER COLUMN "material" TYPE "FrameMaterial_new" USING ("material"::text::"FrameMaterial_new");
ALTER TYPE "FrameMaterial" RENAME TO "FrameMaterial_old";
ALTER TYPE "FrameMaterial_new" RENAME TO "FrameMaterial";
DROP TYPE "FrameMaterial_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "PartType_new" AS ENUM ('FRAME', 'FORK', 'BOTTOM_BRACKET', 'CRANKSET', 'CHAINRING', 'WHEELSET', 'TYRE', 'TUBE', 'BRAKE_CALIPER', 'BRAKE_LEVER', 'ROTOR', 'SHIFTER', 'REAR_DERAILLEUR', 'FRONT_DERAILLEUR', 'CASSETTE', 'CHAIN', 'HEADSET', 'REAR_SHOCK', 'HANDLEBAR', 'STEM', 'SEATPOST', 'SEAT_CLAMP', 'SADDLE', 'PEDAL', 'SHOE', 'CHAIN_GUIDE', 'DERAILLEUR_HANGER');
ALTER TABLE "Part" ALTER COLUMN "type" TYPE "PartType_new" USING ("type"::text::"PartType_new");
ALTER TYPE "PartType" RENAME TO "PartType_old";
ALTER TYPE "PartType_new" RENAME TO "PartType";
DROP TYPE "PartType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "VendorName_new" AS ENUM ('CANYON_UK', 'TREDZ', 'EVANS_CYCLES', 'SIGMA_SPORTS', 'MERLIN_CYCLES');
ALTER TABLE "Vendor" ALTER COLUMN "name" TYPE "VendorName_new" USING ("name"::text::"VendorName_new");
ALTER TYPE "VendorName" RENAME TO "VendorName_old";
ALTER TYPE "VendorName_new" RENAME TO "VendorName";
DROP TYPE "VendorName_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "Tire" DROP CONSTRAINT "Tire_partId_fkey";

-- AlterTable
ALTER TABLE "Fork" DROP COLUMN "maxTireWidthMm",
DROP COLUMN "maxTireWidthMm650b",
ADD COLUMN     "maxTyreWidthMm" INTEGER NOT NULL,
ADD COLUMN     "maxTyreWidthMm650b" INTEGER;

-- AlterTable
ALTER TABLE "Frame" DROP COLUMN "maxTireWidthMm",
DROP COLUMN "maxTireWidthMm650b",
ADD COLUMN     "maxTyreWidthMm" INTEGER NOT NULL,
ADD COLUMN     "maxTyreWidthMm650b" INTEGER;

-- AlterTable
ALTER TABLE "Part" DROP COLUMN "basePriceCents",
ADD COLUMN     "basePricePence" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Price" DROP COLUMN "priceCents",
ADD COLUMN     "currency" "Currency" NOT NULL DEFAULT 'GBP',
ADD COLUMN     "includesVat" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pricePence" INTEGER NOT NULL,
ADD COLUMN     "vatRatePercent" INTEGER NOT NULL DEFAULT 20;

-- AlterTable
ALTER TABLE "StockAlert" DROP COLUMN "targetPriceCents",
ADD COLUMN     "targetPricePence" INTEGER;

-- DropTable
DROP TABLE "Tire";

-- CreateTable
CREATE TABLE "Tyre" (
    "partId" TEXT NOT NULL,
    "wheelDiameter" "WheelDiameter" NOT NULL,
    "widthMm" INTEGER NOT NULL,
    "tubeless" BOOLEAN NOT NULL DEFAULT false,
    "hooklessSafe" BOOLEAN NOT NULL DEFAULT false,
    "maxPressurePsi" INTEGER,

    CONSTRAINT "Tyre_pkey" PRIMARY KEY ("partId")
);

-- AddForeignKey
ALTER TABLE "Tyre" ADD CONSTRAINT "Tyre_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

