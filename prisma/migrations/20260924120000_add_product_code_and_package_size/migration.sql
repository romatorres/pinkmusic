-- CreateEnum
CREATE TYPE "PackageSize" AS ENUM ('SMALL', 'MEDIUM', 'LARGE', 'XLARGE');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "code" TEXT,
ADD COLUMN "packageSize" "PackageSize" NOT NULL DEFAULT 'SMALL';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "uberCourierName" TEXT,
ADD COLUMN "uberCourierPhone" TEXT,
ADD COLUMN "uberVehicleType" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Product_code_key" ON "Product"("code");

-- CreateIndex
CREATE INDEX "Product_code_idx" ON "Product"("code");
