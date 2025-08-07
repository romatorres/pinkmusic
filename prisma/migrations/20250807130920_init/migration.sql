-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "currency_id" TEXT NOT NULL,
    "thumbnail" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "available_quantity" INTEGER NOT NULL,
    "seller_nickname" TEXT NOT NULL,
    "permalink" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_permalink_key" ON "Product"("permalink");
