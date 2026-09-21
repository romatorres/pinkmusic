-- CreateEnum
CREATE TYPE "ProductOrigin" AS ENUM ('MERCADO_LIVRE', 'LOCAL');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "description" TEXT,
ADD COLUMN     "isLocalPickup" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "origin" "ProductOrigin" NOT NULL DEFAULT 'MERCADO_LIVRE',
ALTER COLUMN "currency_id" SET DEFAULT 'BRL',
ALTER COLUMN "condition" SET DEFAULT 'new',
ALTER COLUMN "available_quantity" SET DEFAULT 0,
ALTER COLUMN "seller_nickname" SET DEFAULT 'Pink Music',
ALTER COLUMN "permalink" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Product_origin_idx" ON "Product"("origin");
