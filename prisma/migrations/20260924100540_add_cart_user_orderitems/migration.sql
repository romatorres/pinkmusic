-- =============================================================
-- Migração: Carrinho, Itens de Pedido e Autenticação de Cliente
-- =============================================================

-- Nota: A coluna "deliveryFee" já existe no banco (adicionada fora do histórico).
-- Esta migração corrige o drift e adiciona as novas estruturas.

-- 1. Corrigir drift: adicionar deliveryFee se não existir
-- (usando DO $$ para não falhar se já existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Order' AND column_name = 'deliveryFee'
  ) THEN
    ALTER TABLE "Order" ADD COLUMN "deliveryFee" DOUBLE PRECISION NOT NULL DEFAULT 0;
  END IF;
END $$;

-- 2. Adicionar campo phone no User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT;

-- 3. Tornar productId opcional no Order (para suportar pedidos com múltiplos itens)
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_productId_fkey";
ALTER TABLE "Order" ALTER COLUMN "productId" DROP NOT NULL;

-- 4. Adicionar campo userId no Order
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- 5. Criar índice para userId
CREATE INDEX IF NOT EXISTS "Order_userId_idx" ON "Order"("userId");

-- 6. Adicionar foreign key de userId -> User
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 7. Re-criar foreign key de productId -> Product (agora opcional)
ALTER TABLE "Order" ADD CONSTRAINT "Order_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 8. Criar tabela OrderItem
CREATE TABLE IF NOT EXISTS "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "thumbnail" TEXT,
    "productCode" TEXT,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- 9. Índices para OrderItem
CREATE INDEX IF NOT EXISTS "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX IF NOT EXISTS "OrderItem_productId_idx" ON "OrderItem"("productId");

-- 10. Foreign key de OrderItem -> Order (com cascade delete)
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
