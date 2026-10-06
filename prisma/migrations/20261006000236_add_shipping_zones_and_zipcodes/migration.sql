-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "shippingCep" TEXT,
ADD COLUMN     "shippingDistance" DOUBLE PRECISION,
ADD COLUMN     "shippingMethod" TEXT,
ADD COLUMN     "shippingPrice" DOUBLE PRECISION,
ADD COLUMN     "shippingZone" TEXT;

-- CreateTable
CREATE TABLE "ShippingZone" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "minDistance" DOUBLE PRECISION NOT NULL,
    "maxDistance" DOUBLE PRECISION NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingZipCode" (
    "id" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT 'Feira de Santana',
    "state" TEXT NOT NULL DEFAULT 'BA',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "zoneId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingZipCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShippingZone_active_idx" ON "ShippingZone"("active");

-- CreateIndex
CREATE UNIQUE INDEX "ShippingZipCode_zipCode_key" ON "ShippingZipCode"("zipCode");

-- CreateIndex
CREATE INDEX "ShippingZipCode_zipCode_idx" ON "ShippingZipCode"("zipCode");

-- CreateIndex
CREATE INDEX "ShippingZipCode_zoneId_idx" ON "ShippingZipCode"("zoneId");

-- AddForeignKey
ALTER TABLE "ShippingZipCode" ADD CONSTRAINT "ShippingZipCode_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "ShippingZone"("id") ON DELETE SET NULL ON UPDATE CASCADE;
