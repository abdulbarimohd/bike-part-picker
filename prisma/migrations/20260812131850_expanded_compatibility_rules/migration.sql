/*
  Warnings:

  - You are about to drop the column `rotorMountType` on the `Wheelset` table. All the data in the column will be lost.
  - Added the required column `rotorMountStandard` to the `Wheelset` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AxleThreadPitch" AS ENUM ('M12_x_1_0', 'M12_x_1_5', 'M12_x_1_75', 'M15_x_1_5', 'NONE_QR');

-- CreateEnum
CREATE TYPE "DropoutType" AS ENUM ('THRU_AXLE', 'QUICK_RELEASE', 'UDH');

-- CreateEnum
CREATE TYPE "HeadsetCupStandard" AS ENUM ('EC34', 'EC44', 'EC49', 'ZS44', 'ZS49', 'ZS56', 'IS41', 'IS42', 'IS52');

-- CreateEnum
CREATE TYPE "HangerStandard" AS ENUM ('UDH', 'PROPRIETARY', 'DIRECT_MOUNT');

-- CreateEnum
CREATE TYPE "DerailleurMountStandard" AS ENUM ('STANDARD_HANGER', 'UDH_DIRECT_MOUNT', 'DIRECT_MOUNT');

-- CreateEnum
CREATE TYPE "CageLength" AS ENUM ('SHORT_SS', 'MEDIUM_GS', 'LONG_SGS');

-- CreateEnum
CREATE TYPE "ChainStandard" AS ENUM ('SHIMANO_HG_10', 'SHIMANO_HG_11', 'SHIMANO_HG_12_MTB', 'SHIMANO_HG_12_ROAD', 'SRAM_EAGLE_12', 'SRAM_FLATTOP_12', 'SRAM_11', 'CAMPAGNOLO_12');

-- CreateEnum
CREATE TYPE "RotorMountStandard" AS ENUM ('SIX_BOLT', 'CENTERLOCK');

-- CreateEnum
CREATE TYPE "LockringType" AS ENUM ('INTERNAL', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "BrakeFluidType" AS ENUM ('DOT', 'MINERAL_OIL', 'NONE_MECHANICAL');

-- CreateEnum
CREATE TYPE "ValveType" AS ENUM ('PRESTA', 'SCHRADER');

-- CreateEnum
CREATE TYPE "ShockMountType" AS ENUM ('STANDARD_EYELET', 'TRUNNION');

-- CreateEnum
CREATE TYPE "ShockSizing" AS ENUM ('METRIC', 'IMPERIAL');

-- CreateEnum
CREATE TYPE "RoutingType" AS ENUM ('INTERNAL', 'EXTERNAL', 'MIXED', 'NONE');

-- CreateEnum
CREATE TYPE "DropperRemoteType" AS ENUM ('CABLE', 'ELECTRONIC', 'HYDRAULIC', 'NONE');

-- CreateEnum
CREATE TYPE "SaddleRailType" AS ENUM ('ROUND_7MM', 'OVAL_7X9MM', 'ROUND_8MM');

-- CreateEnum
CREATE TYPE "BarType" AS ENUM ('FLAT', 'RISER', 'DROP', 'AERO');

-- CreateEnum
CREATE TYPE "PedalThread" AS ENUM ('NINE_SIXTEENTHS', 'HALF_INCH');

-- CreateEnum
CREATE TYPE "CleatSystem" AS ENUM ('SPD', 'SPD_SL', 'LOOK_KEO', 'CRANK_BROTHERS', 'TIME', 'SPEEDPLAY', 'FLAT_NONE');

-- CreateEnum
CREATE TYPE "SoleDrilling" AS ENUM ('TWO_BOLT', 'THREE_BOLT', 'TWO_AND_THREE_BOLT', 'FLAT_NONE');

-- CreateEnum
CREATE TYPE "FdMountType" AS ENUM ('BRAZE_ON', 'CLAMP_28_6', 'CLAMP_31_8', 'CLAMP_34_9', 'DIRECT_MOUNT');

-- CreateEnum
CREATE TYPE "PullDirection" AS ENUM ('TOP_PULL', 'BOTTOM_PULL', 'DUAL_PULL');

-- CreateEnum
CREATE TYPE "IscgStandard" AS ENUM ('ISCG_05', 'ISCG_OLD', 'BB_MOUNT', 'NONE');

-- CreateEnum
CREATE TYPE "ChainringMountStandard" AS ENUM ('BCD_104', 'BCD_96', 'BCD_94', 'BCD_110', 'BCD_76', 'SRAM_3_BOLT', 'RACE_FACE_CINCH', 'SHIMANO_DIRECT_MOUNT');

-- CreateEnum
CREATE TYPE "HousingType" AS ENUM ('COMPRESSIONLESS', 'STANDARD');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AxleType" ADD VALUE 'QUICK_RELEASE_135x9';
ALTER TYPE "AxleType" ADD VALUE 'THRU_AXLE_150x12_DH';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BbShellStandard" ADD VALUE 'BSA_83';
ALTER TYPE "BbShellStandard" ADD VALUE 'BSA_100';
ALTER TYPE "BbShellStandard" ADD VALUE 'ITALIAN_70';
ALTER TYPE "BbShellStandard" ADD VALUE 'PF107';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CablePullStandard" ADD VALUE 'SRAM_FULL_PULL';
ALTER TYPE "CablePullStandard" ADD VALUE 'ELECTRONIC_EPS';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "FreehubBodyType" ADD VALUE 'HG_12';
ALTER TYPE "FreehubBodyType" ADD VALUE 'CAMPAGNOLO_N3W';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PartType" ADD VALUE 'CHAINRING';
ALTER TYPE "PartType" ADD VALUE 'TUBE';
ALTER TYPE "PartType" ADD VALUE 'BRAKE_LEVER';
ALTER TYPE "PartType" ADD VALUE 'ROTOR';
ALTER TYPE "PartType" ADD VALUE 'FRONT_DERAILLEUR';
ALTER TYPE "PartType" ADD VALUE 'CASSETTE';
ALTER TYPE "PartType" ADD VALUE 'CHAIN';
ALTER TYPE "PartType" ADD VALUE 'HEADSET';
ALTER TYPE "PartType" ADD VALUE 'REAR_SHOCK';
ALTER TYPE "PartType" ADD VALUE 'STEM';
ALTER TYPE "PartType" ADD VALUE 'SEAT_CLAMP';
ALTER TYPE "PartType" ADD VALUE 'SADDLE';
ALTER TYPE "PartType" ADD VALUE 'PEDAL';
ALTER TYPE "PartType" ADD VALUE 'SHOE';
ALTER TYPE "PartType" ADD VALUE 'CHAIN_GUIDE';
ALTER TYPE "PartType" ADD VALUE 'DERAILLEUR_HANGER';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SpindleInterface" ADD VALUE 'SQUARE_TAPER';
ALTER TYPE "SpindleInterface" ADD VALUE 'ISIS';

-- AlterEnum
ALTER TYPE "WheelDiameter" ADD VALUE 'ISO_507';

-- AlterTable
ALTER TABLE "BottomBracket" ADD COLUMN     "shellWidthMm" INTEGER;

-- AlterTable
ALTER TABLE "BrakeCaliper" ADD COLUMN     "brakeSystemFamily" TEXT,
ADD COLUMN     "fluidType" "BrakeFluidType",
ADD COLUMN     "maxRotorThicknessMm" DOUBLE PRECISION,
ADD COLUMN     "minRotorThicknessMm" DOUBLE PRECISION,
ADD COLUMN     "nativeRotorMm" INTEGER,
ADD COLUMN     "padShape" TEXT;

-- AlterTable
ALTER TABLE "Build" ADD COLUMN     "riderHeightCm" INTEGER,
ADD COLUMN     "riderInseamCm" INTEGER,
ADD COLUMN     "riderWeightKg" INTEGER;

-- AlterTable
ALTER TABLE "BuildPart" ADD COLUMN     "slot" TEXT;

-- AlterTable
ALTER TABLE "Crankset" ADD COLUMN     "chainlineMm" DOUBLE PRECISION,
ADD COLUMN     "chainringCount" INTEGER,
ADD COLUMN     "chainringMount" "ChainringMountStandard",
ADD COLUMN     "crankLengthMm" INTEGER,
ADD COLUMN     "maxChainringTeeth" INTEGER,
ADD COLUMN     "pedalThread" "PedalThread",
ADD COLUMN     "qFactorMm" INTEGER,
ADD COLUMN     "spindleLengthMm" INTEGER;

-- AlterTable
ALTER TABLE "Fork" ADD COLUMN     "axleToCrownMm" INTEGER,
ADD COLUMN     "crownRaceDiameterMm" DOUBLE PRECISION,
ADD COLUMN     "dropoutType" "DropoutType",
ADD COLUMN     "frontAxleLengthMm" INTEGER,
ADD COLUMN     "frontAxleThreadPitch" "AxleThreadPitch",
ADD COLUMN     "isSuspension" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "maxRotorMm" INTEGER,
ADD COLUMN     "offsetMm" INTEGER,
ADD COLUMN     "steererLengthMm" INTEGER,
ADD COLUMN     "travelMm" INTEGER;

-- AlterTable
ALTER TABLE "Frame" ADD COLUMN     "bbShellWidthMm" INTEGER,
ADD COLUMN     "bottleMounts" INTEGER,
ADD COLUMN     "cableRouting" "RoutingType",
ADD COLUMN     "chainstayLengthMm" INTEGER,
ADD COLUMN     "designAxleToCrownMm" INTEGER,
ADD COLUMN     "dropoutType" "DropoutType",
ADD COLUMN     "fdMountType" "FdMountType",
ADD COLUMN     "fdPullDirection" "PullDirection",
ADD COLUMN     "frameSize" TEXT,
ADD COLUMN     "hangerStandard" "HangerStandard",
ADD COLUMN     "hasEyelets" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "headTubeLengthMm" INTEGER,
ADD COLUMN     "headTubeLowerStandard" "HeadsetCupStandard",
ADD COLUMN     "headTubeUpperStandard" "HeadsetCupStandard",
ADD COLUMN     "iscgStandard" "IscgStandard",
ADD COLUMN     "leverageRatio" DOUBLE PRECISION,
ADD COLUMN     "maxChainringTeeth" INTEGER,
ADD COLUMN     "maxForkTravelMm" INTEGER,
ADD COLUMN     "maxRotorMmRear" INTEGER,
ADD COLUMN     "maxSeatpostInsertionMm" INTEGER,
ADD COLUMN     "mulletApproved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reachMm" INTEGER,
ADD COLUMN     "rearAxleLengthMm" INTEGER,
ADD COLUMN     "rearAxleThreadPitch" "AxleThreadPitch",
ADD COLUMN     "riderMaxHeightCm" INTEGER,
ADD COLUMN     "riderMinHeightCm" INTEGER,
ADD COLUMN     "seatClampDiameterMm" DOUBLE PRECISION,
ADD COLUMN     "seatpostDiameterMm" DOUBLE PRECISION,
ADD COLUMN     "seatpostRouting" "RoutingType",
ADD COLUMN     "shockBushingDiameterMm" DOUBLE PRECISION,
ADD COLUMN     "shockEyeToEyeMm" INTEGER,
ADD COLUMN     "shockHardwareWidthMm" INTEGER,
ADD COLUMN     "shockMountType" "ShockMountType",
ADD COLUMN     "shockStrokeMm" INTEGER,
ADD COLUMN     "stackMm" INTEGER,
ADD COLUMN     "standoverMm" INTEGER,
ADD COLUMN     "suitableForCoil" BOOLEAN;

-- AlterTable
ALTER TABLE "RearDerailleur" ADD COLUMN     "cageLength" "CageLength",
ADD COLUMN     "minCassetteCogTeeth" INTEGER,
ADD COLUMN     "mountStandard" "DerailleurMountStandard",
ADD COLUMN     "totalCapacityTeeth" INTEGER;

-- AlterTable
ALTER TABLE "Shifter" ADD COLUMN     "barType" "BarType",
ADD COLUMN     "clampDiameterMm" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Tire" ADD COLUMN     "hooklessSafe" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxPressurePsi" INTEGER;

-- AlterTable
ALTER TABLE "Wheelset" DROP COLUMN "rotorMountType",
ADD COLUMN     "convertibleEndCaps" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasBrakeTrack" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hookless" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxPressurePsi" INTEGER,
ADD COLUMN     "rimDepthMm" INTEGER,
ADD COLUMN     "rotorMountStandard" "RotorMountStandard" NOT NULL,
ADD COLUMN     "valveHoleType" "ValveType";

-- CreateTable
CREATE TABLE "Chainring" (
    "partId" TEXT NOT NULL,
    "mountStandard" "ChainringMountStandard" NOT NULL,
    "boltCount" INTEGER,
    "teeth" INTEGER NOT NULL,
    "narrowWide" BOOLEAN NOT NULL DEFAULT false,
    "offsetMm" DOUBLE PRECISION,
    "speeds" INTEGER,

    CONSTRAINT "Chainring_pkey" PRIMARY KEY ("partId")
);

-- CreateTable
CREATE TABLE "Tube" (
    "partId" TEXT NOT NULL,
    "wheelDiameter" "WheelDiameter" NOT NULL,
    "minWidthMm" INTEGER NOT NULL,
    "maxWidthMm" INTEGER NOT NULL,
    "valveType" "ValveType" NOT NULL,
    "valveLengthMm" INTEGER NOT NULL,

    CONSTRAINT "Tube_pkey" PRIMARY KEY ("partId")
);

-- CreateTable
CREATE TABLE "BrakeLever" (
    "partId" TEXT NOT NULL,
    "isHydraulic" BOOLEAN NOT NULL DEFAULT true,
    "fluidType" "BrakeFluidType",
    "brakeSystemFamily" TEXT,
    "barType" "BarType",
    "clampDiameterMm" DOUBLE PRECISION,
    "requiresCompressionless" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BrakeLever_pkey" PRIMARY KEY ("partId")
);

-- CreateTable
CREATE TABLE "Rotor" (
    "partId" TEXT NOT NULL,
    "diameterMm" INTEGER NOT NULL,
    "mountStandard" "RotorMountStandard" NOT NULL,
    "lockringType" "LockringType",
    "thicknessMm" DOUBLE PRECISION,

    CONSTRAINT "Rotor_pkey" PRIMARY KEY ("partId")
);

-- CreateTable
CREATE TABLE "FrontDerailleur" (
    "partId" TEXT NOT NULL,
    "speeds" INTEGER NOT NULL,
    "cablePullStandard" "CablePullStandard" NOT NULL,
    "mountType" "FdMountType" NOT NULL,
    "pullDirection" "PullDirection" NOT NULL,
    "maxChainringTeeth" INTEGER,

    CONSTRAINT "FrontDerailleur_pkey" PRIMARY KEY ("partId")
);

-- CreateTable
CREATE TABLE "Cassette" (
    "partId" TEXT NOT NULL,
    "speeds" INTEGER NOT NULL,
    "freehubBodyType" "FreehubBodyType" NOT NULL,
    "smallestCogTeeth" INTEGER NOT NULL,
    "largestCogTeeth" INTEGER NOT NULL,
    "requiresSpacerMm" DOUBLE PRECISION,

    CONSTRAINT "Cassette_pkey" PRIMARY KEY ("partId")
);

-- CreateTable
CREATE TABLE "Chain" (
    "partId" TEXT NOT NULL,
    "speeds" INTEGER NOT NULL,
    "chainStandard" "ChainStandard" NOT NULL,
    "links" INTEGER,

    CONSTRAINT "Chain_pkey" PRIMARY KEY ("partId")
);

-- CreateTable
CREATE TABLE "Headset" (
    "partId" TEXT NOT NULL,
    "upperStandard" "HeadsetCupStandard" NOT NULL,
    "lowerStandard" "HeadsetCupStandard" NOT NULL,
    "crownRaceDiameterMm" DOUBLE PRECISION,
    "stackHeightMm" DOUBLE PRECISION,

    CONSTRAINT "Headset_pkey" PRIMARY KEY ("partId")
);

-- CreateTable
CREATE TABLE "RearShock" (
    "partId" TEXT NOT NULL,
    "eyeToEyeMm" INTEGER NOT NULL,
    "strokeMm" INTEGER NOT NULL,
    "mountType" "ShockMountType" NOT NULL,
    "hardwareWidthMm" INTEGER,
    "bushingDiameterMm" DOUBLE PRECISION,
    "sizing" "ShockSizing" NOT NULL,
    "isCoil" BOOLEAN NOT NULL DEFAULT false,
    "springRate" INTEGER,
    "hasReservoir" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "RearShock_pkey" PRIMARY KEY ("partId")
);

-- CreateTable
CREATE TABLE "Handlebar" (
    "partId" TEXT NOT NULL,
    "clampDiameterMm" DOUBLE PRECISION NOT NULL,
    "controlClampDiameterMm" DOUBLE PRECISION NOT NULL,
    "barType" "BarType" NOT NULL,
    "widthMm" INTEGER,
    "riseMm" INTEGER,
    "internalRouting" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Handlebar_pkey" PRIMARY KEY ("partId")
);

-- CreateTable
CREATE TABLE "Stem" (
    "partId" TEXT NOT NULL,
    "barClampDiameterMm" DOUBLE PRECISION NOT NULL,
    "steererClampMm" DOUBLE PRECISION NOT NULL,
    "lengthMm" INTEGER,
    "riseDegrees" INTEGER,
    "integratedCockpit" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Stem_pkey" PRIMARY KEY ("partId")
);

-- CreateTable
CREATE TABLE "Seatpost" (
    "partId" TEXT NOT NULL,
    "diameterMm" DOUBLE PRECISION NOT NULL,
    "totalLengthMm" INTEGER NOT NULL,
    "isDropper" BOOLEAN NOT NULL DEFAULT false,
    "travelMm" INTEGER,
    "routingType" "RoutingType",
    "remoteType" "DropperRemoteType",
    "railClampType" "SaddleRailType",
    "setbackMm" INTEGER,

    CONSTRAINT "Seatpost_pkey" PRIMARY KEY ("partId")
);

-- CreateTable
CREATE TABLE "SeatClamp" (
    "partId" TEXT NOT NULL,
    "diameterMm" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "SeatClamp_pkey" PRIMARY KEY ("partId")
);

-- CreateTable
CREATE TABLE "Saddle" (
    "partId" TEXT NOT NULL,
    "railType" "SaddleRailType" NOT NULL,
    "widthMm" INTEGER,

    CONSTRAINT "Saddle_pkey" PRIMARY KEY ("partId")
);

-- CreateTable
CREATE TABLE "Pedal" (
    "partId" TEXT NOT NULL,
    "thread" "PedalThread" NOT NULL,
    "cleatSystem" "CleatSystem" NOT NULL,

    CONSTRAINT "Pedal_pkey" PRIMARY KEY ("partId")
);

-- CreateTable
CREATE TABLE "Shoe" (
    "partId" TEXT NOT NULL,
    "soleDrilling" "SoleDrilling" NOT NULL,

    CONSTRAINT "Shoe_pkey" PRIMARY KEY ("partId")
);

-- CreateTable
CREATE TABLE "ChainGuide" (
    "partId" TEXT NOT NULL,
    "mountStandard" "IscgStandard" NOT NULL,
    "maxChainringTeeth" INTEGER,
    "minChainringTeeth" INTEGER,

    CONSTRAINT "ChainGuide_pkey" PRIMARY KEY ("partId")
);

-- CreateTable
CREATE TABLE "DerailleurHanger" (
    "partId" TEXT NOT NULL,
    "hangerStandard" "HangerStandard" NOT NULL,
    "model" TEXT,

    CONSTRAINT "DerailleurHanger_pkey" PRIMARY KEY ("partId")
);

-- AddForeignKey
ALTER TABLE "Chainring" ADD CONSTRAINT "Chainring_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tube" ADD CONSTRAINT "Tube_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrakeLever" ADD CONSTRAINT "BrakeLever_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rotor" ADD CONSTRAINT "Rotor_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrontDerailleur" ADD CONSTRAINT "FrontDerailleur_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cassette" ADD CONSTRAINT "Cassette_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chain" ADD CONSTRAINT "Chain_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Headset" ADD CONSTRAINT "Headset_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RearShock" ADD CONSTRAINT "RearShock_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Handlebar" ADD CONSTRAINT "Handlebar_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stem" ADD CONSTRAINT "Stem_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Seatpost" ADD CONSTRAINT "Seatpost_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatClamp" ADD CONSTRAINT "SeatClamp_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Saddle" ADD CONSTRAINT "Saddle_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedal" ADD CONSTRAINT "Pedal_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shoe" ADD CONSTRAINT "Shoe_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChainGuide" ADD CONSTRAINT "ChainGuide_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DerailleurHanger" ADD CONSTRAINT "DerailleurHanger_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;
