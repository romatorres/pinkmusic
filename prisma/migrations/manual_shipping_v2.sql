ALTER TABLE "ShippingZone" ADD COLUMN IF NOT EXISTS "order" INTEGER;
UPDATE "ShippingZone" SET "order" = subq.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "minDistance" ASC) AS rn FROM "ShippingZone"
) subq
WHERE "ShippingZone".id = subq.id;
ALTER TABLE "ShippingZone" ALTER COLUMN "order" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "ShippingZone_order_key" ON "ShippingZone"("order");

-- Adicionar colunas novas em ShippingZipCode se não existirem
ALTER TABLE "ShippingZipCode" ADD COLUMN IF NOT EXISTS "source" TEXT;
ALTER TABLE "ShippingZipCode" ADD COLUMN IF NOT EXISTS "confidence" TEXT DEFAULT 'high';
CREATE INDEX IF NOT EXISTS "ShippingZipCode_confidence_idx" ON "ShippingZipCode"("confidence");

-- Criar tabelas novas
CREATE TABLE IF NOT EXISTS "ShippingNeighborhood" (
  "id"            TEXT NOT NULL,
  "name"          TEXT NOT NULL,
  "normalizedKey" TEXT NOT NULL,
  "aliases"       TEXT[] NOT NULL DEFAULT '{}',
  "zoneId"        TEXT,
  "outOfArea"     BOOLEAN NOT NULL DEFAULT false,
  "zoneOrder"     INTEGER,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShippingNeighborhood_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ShippingNeighborhood_normalizedKey_key" UNIQUE ("normalizedKey"),
  CONSTRAINT "ShippingNeighborhood_zoneId_fkey"
    FOREIGN KEY ("zoneId") REFERENCES "ShippingZone"("id") ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "ShippingNeighborhood_normalizedKey_idx" ON "ShippingNeighborhood"("normalizedKey");
CREATE INDEX IF NOT EXISTS "ShippingNeighborhood_zoneId_idx"         ON "ShippingNeighborhood"("zoneId");
CREATE INDEX IF NOT EXISTS "ShippingNeighborhood_outOfArea_idx"      ON "ShippingNeighborhood"("outOfArea");

CREATE TABLE IF NOT EXISTS "ShippingZipOverride" (
  "id"        TEXT NOT NULL,
  "zipCode"   TEXT NOT NULL,
  "district"  TEXT NOT NULL,
  "zoneOrder" INTEGER NOT NULL,
  "note"      TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShippingZipOverride_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ShippingZipOverride_zipCode_key" UNIQUE ("zipCode")
);
CREATE INDEX IF NOT EXISTS "ShippingZipOverride_zipCode_idx" ON "ShippingZipOverride"("zipCode");

CREATE TABLE IF NOT EXISTS "ShippingUnresolvedZip" (
  "id"        TEXT NOT NULL,
  "zipCode"   TEXT NOT NULL,
  "district"  TEXT,
  "city"      TEXT,
  "state"     TEXT,
  "reason"    TEXT NOT NULL,
  "hitCount"  INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShippingUnresolvedZip_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ShippingUnresolvedZip_zipCode_key" UNIQUE ("zipCode")
);
CREATE INDEX IF NOT EXISTS "ShippingUnresolvedZip_zipCode_idx" ON "ShippingUnresolvedZip"("zipCode");
CREATE INDEX IF NOT EXISTS "ShippingUnresolvedZip_reason_idx"  ON "ShippingUnresolvedZip"("reason");
