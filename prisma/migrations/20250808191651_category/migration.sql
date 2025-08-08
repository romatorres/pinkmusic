-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "currency_id" TEXT NOT NULL,
    "thumbnail" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "available_quantity" INTEGER NOT NULL,
    "seller_nickname" TEXT NOT NULL,
    "permalink" TEXT NOT NULL,
    "categoryId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Product" ("available_quantity", "condition", "createdAt", "currency_id", "id", "permalink", "price", "seller_nickname", "thumbnail", "title", "updatedAt") SELECT "available_quantity", "condition", "createdAt", "currency_id", "id", "permalink", "price", "seller_nickname", "thumbnail", "title", "updatedAt" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_permalink_key" ON "Product"("permalink");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");
