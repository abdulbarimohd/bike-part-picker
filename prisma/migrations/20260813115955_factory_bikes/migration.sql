-- DropIndex
DROP INDEX "BuildPart_buildId_partId_key";

-- AlterTable
ALTER TABLE "Build" ADD COLUMN     "basedOnModelId" TEXT;

-- CreateTable
CREATE TABLE "BikeModel" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "variant" TEXT,
    "slug" TEXT NOT NULL,
    "msrpPence" INTEGER,
    "discipline" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BikeModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BikeModelPart" (
    "id" TEXT NOT NULL,
    "bikeModelId" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "slot" TEXT,

    CONSTRAINT "BikeModelPart_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BikeModel_slug_key" ON "BikeModel"("slug");

-- CreateIndex
CREATE INDEX "BikeModel_brand_idx" ON "BikeModel"("brand");

-- CreateIndex
CREATE UNIQUE INDEX "BikeModel_brand_model_year_variant_key" ON "BikeModel"("brand", "model", "year", "variant");

-- CreateIndex
CREATE INDEX "BikeModelPart_bikeModelId_idx" ON "BikeModelPart"("bikeModelId");

-- CreateIndex
CREATE UNIQUE INDEX "BikeModelPart_bikeModelId_partId_slot_key" ON "BikeModelPart"("bikeModelId", "partId", "slot");

-- CreateIndex
CREATE UNIQUE INDEX "BuildPart_buildId_partId_slot_key" ON "BuildPart"("buildId", "partId", "slot");

-- AddForeignKey
ALTER TABLE "Build" ADD CONSTRAINT "Build_basedOnModelId_fkey" FOREIGN KEY ("basedOnModelId") REFERENCES "BikeModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BikeModelPart" ADD CONSTRAINT "BikeModelPart_bikeModelId_fkey" FOREIGN KEY ("bikeModelId") REFERENCES "BikeModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BikeModelPart" ADD CONSTRAINT "BikeModelPart_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

