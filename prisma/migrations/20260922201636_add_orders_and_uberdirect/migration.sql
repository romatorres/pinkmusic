-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'PREPARING', 'DISPATCHED', 'DELIVERED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "deliveryType" TEXT NOT NULL,
    "deliveryAddress" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "mpPaymentId" TEXT,
    "mpQrCode" TEXT,
    "mpQrCodeBase64" TEXT,
    "paidAt" TIMESTAMP(3),
    "uberDeliveryId" TEXT,
    "uberTrackingUrl" TEXT,
    "uberDispatchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Order_mpPaymentId_key" ON "Order"("mpPaymentId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_mpPaymentId_idx" ON "Order"("mpPaymentId");

-- CreateIndex
CREATE INDEX "Order_productId_idx" ON "Order"("productId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
