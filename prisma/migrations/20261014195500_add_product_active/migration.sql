ALTER TABLE "Product"
ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "Product_active_idx" ON "Product"("active");
