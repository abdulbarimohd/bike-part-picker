-- CreateTable
CREATE TABLE "PartBundle" (
    "id" TEXT NOT NULL,
    "parentPartId" TEXT NOT NULL,
    "bundledPartId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "role" TEXT,
    "dataSource" "DataSource" NOT NULL DEFAULT 'UNVERIFIED',
    "sourceUrl" TEXT,
    "dataNotes" TEXT,

    CONSTRAINT "PartBundle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PartBundle_parentPartId_idx" ON "PartBundle"("parentPartId");

-- CreateIndex
CREATE INDEX "PartBundle_bundledPartId_idx" ON "PartBundle"("bundledPartId");

-- CreateIndex
CREATE UNIQUE INDEX "PartBundle_parentPartId_bundledPartId_key" ON "PartBundle"("parentPartId", "bundledPartId");

-- AddForeignKey
ALTER TABLE "PartBundle" ADD CONSTRAINT "PartBundle_parentPartId_fkey" FOREIGN KEY ("parentPartId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartBundle" ADD CONSTRAINT "PartBundle_bundledPartId_fkey" FOREIGN KEY ("bundledPartId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;
