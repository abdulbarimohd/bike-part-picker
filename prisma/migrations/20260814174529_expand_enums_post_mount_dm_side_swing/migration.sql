-- AlterEnum
ALTER TYPE "BrakeMountType" ADD VALUE 'POST_MOUNT';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ChainringMountStandard" ADD VALUE 'SRAM_8_BOLT_ROAD_DM';
ALTER TYPE "ChainringMountStandard" ADD VALUE 'SRAM_8_BOLT_EAGLE_DM';

-- AlterEnum
ALTER TYPE "PullDirection" ADD VALUE 'SIDE_SWING';
