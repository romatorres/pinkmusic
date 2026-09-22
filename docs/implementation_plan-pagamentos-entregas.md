# Plano de Implementação FINAL — PIX + Uber Direct

## Visão Geral

**Stack:** Next.js 15 · TypeScript · Prisma · PostgreSQL (Prisma.io)  
**Pagamento:** Mercado Pago (PIX) — mesma conta do Mercado Livre  
**Entrega:** Uber Direct — credenciais já disponíveis  

---

## O que muda vs. o fluxo atual

| Situação Atual | Após Implementação |
|---|---|
| Copia chave PIX manualmente | QR Code real gerado por pedido via API do MP |
| Confirmação via WhatsApp (manual) | Webhook confirma pagamento automaticamente |
| Sem registro de pedidos no banco | Pedidos com status rastreáveis no banco |
| Estoque não decrementado automaticamente | Decrementa ao confirmar pagamento |
| "Motoboy a combinar" (texto livre) | Uber Direct despacha entregador real |

---

## Credenciais Necessárias

### Mercado Pago (você ainda vai buscar)
Acesse: **mercadopago.com.br/developers** → Suas integrações → Nova aplicação
```bash
MERCADOPAGO_ACCESS_TOKEN=APP_USR-...   # Token de produção
MERCADOPAGO_TEST_TOKEN=TEST-...        # Token de sandbox (para testar)
MERCADOPAGO_PUBLIC_KEY=APP_USR-...     # Chave pública
```

### Uber Direct (você já tem)
```bash
UBER_CLIENT_ID=...        # ID de Cliente do Desenvolvedor
UBER_CLIENT_SECRET=...    # Client Secret
UBER_CUSTOMER_ID=...      # ID do Usuário (conta Uber Direct)
```

---

## FASE 1 — Pagamento PIX via Mercado Pago

### 1.1 — Banco de Dados

#### [MODIFY] [schema.prisma](file:///c:/Web/pinkmusic/prisma/schema.prisma)

Adicionar:

```prisma
model Order {
  id              String      @id @default(cuid())
  customerName    String
  customerPhone   String
  productId       String
  product         Product     @relation(fields: [productId], references: [id])
  quantity        Int         @default(1)
  totalAmount     Float
  deliveryType    String      // "pickup" | "delivery"
  deliveryAddress String?
  status          OrderStatus @default(PENDING_PAYMENT)

  // Mercado Pago
  mpPaymentId    String?  @unique
  mpQrCode       String?  // código copia-e-cola Pix
  mpQrCodeBase64 String?  // imagem do QR como base64
  paidAt         DateTime?

  // Uber Direct (Fase 2)
  uberDeliveryId  String?
  uberTrackingUrl String?
  uberDispatchedAt DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([status])
  @@index([mpPaymentId])
  @@index([productId])
}

enum OrderStatus {
  PENDING_PAYMENT  // aguardando PIX
  PAID             // pagamento confirmado
  PREPARING        // separando o produto
  DISPATCHED       // despachado pelo Uber Direct
  DELIVERED        // entregue ao cliente
  CANCELLED        // cancelado/expirado
}
```

> [!NOTE]
> Também adicionamos `orders Order[]` no model `Product` para a relação inversa.

---

### 1.2 — Biblioteca de Integração

#### [NEW] `src/lib/mercadopago.ts`

Funções:
- `createPixPayment(order)` → chama `POST /v1/payments` com `payment_method_id: "pix"` e retorna `{ id, qr_code, qr_code_base64 }`
- `getPaymentStatus(paymentId)` → busca status do pagamento (`approved`, `pending`, `cancelled`)

---

### 1.3 — APIs do Backend

#### [NEW] `src/app/api/orders/route.ts`
```
POST /api/orders
```
- Valida dados do cliente (nome, telefone, endereço se delivery)
- Verifica estoque disponível no banco
- Cria registro `Order` com status `PENDING_PAYMENT`
- Chama `createPixPayment()` → recebe QR Code do MP
- Salva `mpPaymentId`, `mpQrCode`, `mpQrCodeBase64` no pedido
- Retorna o QR Code para o frontend exibir

```
GET /api/orders (admin autenticado)
```
- Lista todos os pedidos com paginação

#### [NEW] `src/app/api/orders/[id]/route.ts`
```
GET /api/orders/[id]
```
- Retorna status atual do pedido (para polling do frontend)
- Não expõe dados sensíveis para rotas não autenticadas

#### [NEW] `src/app/api/webhooks/mercadopago/route.ts`
```
POST /api/webhooks/mercadopago
```
- Valida assinatura do webhook (x-signature do MP)
- Quando `status = approved`: atualiza pedido para `PAID`, decrementa estoque, registra `paidAt`
- Quando `status = cancelled`: atualiza pedido para `CANCELLED`, devolve estoque (se necessário)

> [!WARNING]
> Em desenvolvimento local, será necessário usar **ngrok** para expor a porta 3000 ao MP:  
> `ngrok http 3000` → use a URL gerada nas configurações de webhook do painel MP

---

### 1.4 — Frontend: Modal Reformulado

#### [MODIFY] [PixCheckoutModal.tsx](file:///c:/Web/pinkmusic/src/components/site/Products/PixCheckoutModal.tsx)

Fluxo de 3 etapas com animação entre steps:

**Etapa 1 — Dados do cliente**
```
[Nome*] [WhatsApp*]
[Retirar na Loja] [Entrega Local]
[Endereço - apenas se Entrega Local]
         ↓ botão "Gerar PIX"
```

**Etapa 2 — QR Code PIX**
```
┌────────────────────────────────┐
│  QR Code real (imagem base64)  │
│  ⏱ Expira em 28:34            │
│  [Copiar código Pix ↗]         │
│  Aguardando pagamento...       │
│  (spinner + polling 5s)        │
└────────────────────────────────┘
```

**Etapa 3 — Confirmação (dispara ao detectar pagamento)**
```
✅ Pagamento confirmado!
Pedido #CLxxxxxx
Produto: [nome]
Modalidade: Retirada / Entrega

[Fechar] [Abrir WhatsApp da loja]
```

---

### 1.5 — Dashboard Admin: Seção Pedidos

#### [NEW] `src/app/dashboard/orders/page.tsx`

Tabela com:
- Status colorido por badge (`PENDING_PAYMENT` amarelo, `PAID` verde, etc.)
- Filtros por status e data
- Ação "Marcar como Em Preparação" para pedidos PAID
- Link de rastreamento Uber (Fase 2)

---

## FASE 2 — Entrega via Uber Direct

> [!NOTE]
> Implementada logo após a Fase 1 — suas credenciais já estão disponíveis.

### Fluxo completo

```
Cliente paga PIX → status PAID
         ↓
Dashboard Admin mostra botão "Cotar Entrega Uber"
         ↓
API cotação Uber Direct retorna: preço + tempo estimado
         ↓
Admin confirma → "Despachar Uber Direct"
         ↓
Uber aloca entregador → status DISPATCHED
         ↓
Webhook Uber → atualiza status em tempo real
         ↓
Cliente pode rastrear via link público do Uber → DELIVERED
```

### 2.1 — Biblioteca de Integração

#### [NEW] `src/lib/uberdirect.ts`

Funções:
- `getDeliveryQuote(pickup, dropoff)` → cotação de preço e tempo
- `createDelivery(orderId, quote)` → cria entrega, retorna `delivery_id` e `tracking_url`
- `getDeliveryStatus(deliveryId)` → status atual da entrega

Autenticação via OAuth2 Client Credentials (`/oauth/v2/token`)

---

### 2.2 — APIs do Backend

#### [NEW] `src/app/api/orders/[id]/dispatch/route.ts`
```
GET  → cotação de preço Uber Direct
POST → confirmar despacho
```
- Endereço de coleta: endereço da loja Pink Music (fixo no `.env`)
- Endereço de entrega: `Order.deliveryAddress`
- Salva `uberDeliveryId` e `uberTrackingUrl` no pedido

#### [NEW] `src/app/api/webhooks/uberdirect/route.ts`
```
POST /api/webhooks/uberdirect
```
- Atualiza `Order.status` conforme eventos: `en_route_to_pickup`, `delivered`, `cancelled`

---

### 2.3 — Dashboard Admin: Botão de Despacho

#### [MODIFY] `src/app/dashboard/orders/page.tsx`

Para pedidos `PAID` com `deliveryType === "delivery"`:
- Botão **"Cotar Uber Direct"** → exibe modal com preço + tempo estimado
- Botão **"Confirmar Despacho"** → aciona entregador
- Badge de rastreamento com link externo do Uber

---

## Variáveis de Ambiente — Completas

```bash
# .env.local — adicionar ao que já existe:

# Mercado Pago
MERCADOPAGO_ACCESS_TOKEN=APP_USR-...   # token de produção
MERCADOPAGO_TEST_TOKEN=TEST-...        # token de sandbox
MERCADOPAGO_WEBHOOK_SECRET=...        # segredo para validar assinatura do webhook

# Uber Direct
UBER_CLIENT_ID=...
UBER_CLIENT_SECRET=...
UBER_CUSTOMER_ID=...

# Endereço da loja (usado no Uber Direct como ponto de coleta)
STORE_ADDRESS="Rua Exemplo, 123, Centro, Feira de Santana, BA"
STORE_LAT=-12.2664
STORE_LNG=-38.9663
```

---

## Ordem de Execução

- [ ] **Passo 1:** Você busca o `MERCADOPAGO_ACCESS_TOKEN` e `TEST_TOKEN` no painel MP
- [ ] **Passo 2:** Implementamos a Fase 1 completa (schema → API → modal)
- [ ] **Passo 3:** Testes em sandbox do MP (sem dinheiro real)
- [ ] **Passo 4:** Vai a produção a Fase 1
- [ ] **Passo 5:** Implementamos a Fase 2 (Uber Direct) — credenciais já prontas
- [ ] **Passo 6:** Testes end-to-end Fase 2
