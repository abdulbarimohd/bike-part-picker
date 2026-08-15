-- CreateEnum
CREATE TYPE "PartType" AS ENUM ('FRAME', 'FORK', 'BOTTOM_BRACKET', 'CRANKSET', 'WHEELSET', 'TIRE', 'BRAKE_CALIPER', 'SHIFTER', 'REAR_DERAILLEUR', 'HANDLEBAR', 'SEATPOST');

-- CreateEnum
CREATE TYPE "BbShellStandard" AS ENUM ('BSA_73', 'BSA_68', 'PF92', 'BB86', 'BB90', 'T47_68', 'T47_73', 'BB30', 'PF30');

-- CreateEnum
CREATE TYPE "SpindleInterface" AS ENUM ('DUB_29', 'GXP', 'HOLLOWTECH_II_24', 'CINCH_30', 'BB30_30', 'OCT_LINK_24');

-- CreateEnum
CREATE TYPE "BrakeMountType" AS ENUM ('FLAT_MOUNT', 'POST_MOUNT_160', 'POST_MOUNT_180', 'IS_MOUNT', 'RIM_BRAKE');

-- CreateEnum
CREATE TYPE "AxleType" AS ENUM ('THRU_AXLE_142x12', 'THRU_AXLE_148x12_BOOST', 'THRU_AXLE_157x12_SUPERBOOST', 'THRU_AXLE_110x15_BOOST', 'THRU_AXLE_100x15', 'QUICK_RELEASE_130x9', 'QUICK_RELEASE_100x9', 'THRU_AXLE_20x110_DH');

-- CreateEnum
CREATE TYPE "HeadsetTaper" AS ENUM ('TAPERED_1_5_TO_1_125', 'STRAIGHT_1_125', 'STRAIGHT_1_5');

-- CreateEnum
CREATE TYPE "WheelDiameter" AS ENUM ('ISO_622', 'ISO_584', 'ISO_559');

-- CreateEnum
CREATE TYPE "FreehubBodyType" AS ENUM ('XD', 'XDR', 'MICRO_SPLINE', 'HG_11', 'HG_10');

-- CreateEnum
CREATE TYPE "CablePullStandard" AS ENUM ('SHIMANO_ROAD', 'SHIMANO_MTB', 'SRAM_EXACT_ACTUATION', 'SRAM_X_ACTUATION', 'CAMPAGNOLO', 'ELECTRONIC_AXS', 'ELECTRONIC_DI2');

-- CreateEnum
CREATE TYPE "FrameMaterial" AS ENUM ('CARBON', 'ALUMINUM', 'STEEL', 'TITANIUM');

-- CreateEnum
CREATE TYPE "VendorName" AS ENUM ('CANYON', 'COMPETITIVE_CYCLIST', 'BACKCOUNTRY');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Build" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Untitled Build',
    "userId" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Build_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuildPart" (
    "id" TEXT NOT NULL,
    "buildId" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BuildPart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Part" (
    "id" TEXT NOT NULL,
    "type" "PartType" NOT NULL,
    "brand" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT,
    "basePriceCents" INTEGER NOT NULL,
    "weightGrams" INTEGER NOT NULL DEFAULT 0,
    "releaseDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Part_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Frame" (
    "partId" TEXT NOT NULL,
    "material" "FrameMaterial" NOT NULL,
    "bbShellStandard" "BbShellStandard" NOT NULL,
    "rearAxleType" "AxleType" NOT NULL,
    "headsetTaper" "HeadsetTaper" NOT NULL,
    "rearBrakeMountType" "BrakeMountType" NOT NULL,
    "wheelDiameter" "WheelDiameter" NOT NULL,
    "maxTireWidthMm" INTEGER NOT NULL,
    "maxTireWidthMm650b" INTEGER,

    CONSTRAINT "Frame_pkey" PRIMARY KEY ("partId")
);

-- CreateTable
CREATE TABLE "Fork" (
    "partId" TEXT NOT NULL,
    "steererTubeTaper" "HeadsetTaper" NOT NULL,
    "frontAxleType" "AxleType" NOT NULL,
    "brakeMountType" "BrakeMountType" NOT NULL,
    "wheelDiameter" "WheelDiameter" NOT NULL,
    "maxTireWidthMm" INTEGER NOT NULL,
    "maxTireWidthMm650b" INTEGER,

    CONSTRAINT "Fork_pkey" PRIMARY KEY ("partId")
);

-- CreateTable
CREATE TABLE "BottomBracket" (
    "partId" TEXT NOT NULL,
    "frameInterface" "BbShellStandard" NOT NULL,
    "spindleInterface" "SpindleInterface" NOT NULL,

    CONSTRAINT "BottomBracket_pkey" PRIMARY KEY ("partId")
);

-- CreateTable
CREATE TABLE "Crankset" (
    "partId" TEXT NOT NULL,
    "spindleDiameter" "SpindleInterface" NOT NULL,
    "chainlineType" TEXT NOT NULL,

    CONSTRAINT "Crankset_pkey" PRIMARY KEY ("partId")
);

-- CreateTable
CREATE TABLE "Wheelset" (
    "partId" TEXT NOT NULL,
    "wheelDiameter" "WheelDiameter" NOT NULL,
    "frontAxleType" "AxleType" NOT NULL,
    "rearAxleType" "AxleType" NOT NULL,
    "freehubBodyType" "FreehubBodyType" NOT NULL,
    "rotorMountType" "BrakeMountType" NOT NULL,
    "tubelessReady" BOOLEAN NOT NULL DEFAULT false,
    "internalRimWidthMm" INTEGER NOT NULL,

    CONSTRAINT "Wheelset_pkey" PRIMARY KEY ("partId")
);

-- CreateTable
CREATE TABLE "Tire" (
    "partId" TEXT NOT NULL,
    "wheelDiameter" "WheelDiameter" NOT NULL,
    "widthMm" INTEGER NOT NULL,
    "tubeless" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Tire_pkey" PRIMARY KEY ("partId")
);

-- CreateTable
CREATE TABLE "BrakeCaliper" (
    "partId" TEXT NOT NULL,
    "mountType" "BrakeMountType" NOT NULL,
    "isHydraulic" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "BrakeCaliper_pkey" PRIMARY KEY ("partId")
);

-- CreateTable
CREATE TABLE "Shifter" (
    "partId" TEXT NOT NULL,
    "speeds" INTEGER NOT NULL,
    "cablePullStandard" "CablePullStandard" NOT NULL,

    CONSTRAINT "Shifter_pkey" PRIMARY KEY ("partId")
);

-- CreateTable
CREATE TABLE "RearDerailleur" (
    "partId" TEXT NOT NULL,
    "maxSpeeds" INTEGER NOT NULL,
    "cablePullStandard" "CablePullStandard" NOT NULL,
    "maxCassetteCogTeeth" INTEGER NOT NULL,

    CONSTRAINT "RearDerailleur_pkey" PRIMARY KEY ("partId")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "name" "VendorName" NOT NULL,
    "siteUrl" TEXT NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Price" (
    "id" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "inStock" BOOLEAN NOT NULL DEFAULT true,
    "productUrl" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Price_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockAlert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "vendorId" TEXT,
    "targetPriceCents" INTEGER,
    "notifyOnRestock" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "triggeredAt" TIMESTAMP(3),

    CONSTRAINT "StockAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Build_userId_idx" ON "Build"("userId");

-- CreateIndex
CREATE INDEX "BuildPart_buildId_idx" ON "BuildPart"("buildId");

-- CreateIndex
CREATE UNIQUE INDEX "BuildPart_buildId_partId_key" ON "BuildPart"("buildId", "partId");

-- CreateIndex
CREATE INDEX "Part_type_idx" ON "Part"("type");

-- CreateIndex
CREATE INDEX "Part_brand_idx" ON "Part"("brand");

-- CreateIndex
CREATE INDEX "Frame_bbShellStandard_idx" ON "Frame"("bbShellStandard");

-- CreateIndex
CREATE INDEX "Frame_rearAxleType_idx" ON "Frame"("rearAxleType");

-- CreateIndex
CREATE INDEX "Fork_frontAxleType_idx" ON "Fork"("frontAxleType");

-- CreateIndex
CREATE INDEX "BottomBracket_frameInterface_idx" ON "BottomBracket"("frameInterface");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_name_key" ON "Vendor"("name");

-- CreateIndex
CREATE INDEX "Price_partId_vendorId_recordedAt_idx" ON "Price"("partId", "vendorId", "recordedAt");

-- CreateIndex
CREATE INDEX "StockAlert_userId_idx" ON "StockAlert"("userId");

-- CreateIndex
CREATE INDEX "StockAlert_partId_idx" ON "StockAlert"("partId");

-- AddForeignKey
ALTER TABLE "Build" ADD CONSTRAINT "Build_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildPart" ADD CONSTRAINT "BuildPart_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES "Build"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildPart" ADD CONSTRAINT "BuildPart_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Frame" ADD CONSTRAINT "Frame_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fork" ADD CONSTRAINT "Fork_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BottomBracket" ADD CONSTRAINT "BottomBracket_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Crankset" ADD CONSTRAINT "Crankset_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wheelset" ADD CONSTRAINT "Wheelset_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tire" ADD CONSTRAINT "Tire_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrakeCaliper" ADD CONSTRAINT "BrakeCaliper_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shifter" ADD CONSTRAINT "Shifter_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RearDerailleur" ADD CONSTRAINT "RearDerailleur_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Price" ADD CONSTRAINT "Price_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Price" ADD CONSTRAINT "Price_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAlert" ADD CONSTRAINT "StockAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAlert" ADD CONSTRAINT "StockAlert_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;
