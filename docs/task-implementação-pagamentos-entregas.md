# Checklist de Implementação — PIX + Uber Direct

## ✅ Fase 1 — Pagamento PIX via Mercado Pago (Concluído no Código)

### Banco de Dados
- [x] Model `Order` com campos de pagamento e entrega adicionado ao `prisma/schema.prisma`
- [x] Relação `orders Order[]` adicionada no model `Product`
- [x] Migration Prisma executada (`20260922201636_add_orders_and_uberdirect`)
- [x] Cliente Prisma gerado (`npx prisma generate`)

### Backend — Libs & APIs
- [x] `src/lib/mercadopago.ts` — integração com a API do Mercado Pago (criação de PIX e consulta de status)
- [x] `src/app/api/orders/route.ts` — criação de pedido com PIX e listagem autenticada (`requireAdmin`)
- [x] `src/app/api/orders/[id]/route.ts` — polling de status e confirmação de pagamento
- [x] `src/app/api/webhooks/mercadopago/route.ts` — webhook para baixa automática imediata

### Frontend
- [x] `src/components/site/Products/PixCheckoutModal.tsx` — modal completo com formulário, QR Code dinâmico, código Pix Copia e Cola, polling em tempo real e tela de confirmação
- [x] `src/components/site/Products/ProductDetails.tsx` — botão de "Compra Local - via PIX" integrado para produtos físicos

### Dashboard Administrativo
- [x] `src/app/dashboard/orders/page.tsx` — painel com listagem de pedidos, filtros por status e detalhes
- [x] `src/app/dashboard/_components/sidebar.tsx` — atalho de navegação "Pedidos" adicionado ao menu

---

## ✅ Fase 2 — Uber Direct (Concluído no Código)

- [x] `src/lib/uberdirect.ts` — autenticação OAuth2, cotação de frete e criação de entrega
- [x] `src/app/api/orders/[id]/dispatch/route.ts` — endpoint para cotação e despacho de entregador
- [x] `src/app/api/webhooks/uberdirect/route.ts` — webhook para atualização de status de entrega (`PICKED_UP`, `DELIVERED`, etc.)
- [x] Integração no dashboard para acompanhamento e link de rastreamento Uber Direct

---

## ⏳ O que falta fazer (Configuração & Testes Práticos)

### 1. Preenchimento de Credenciais no `.env.local`
- [x] Inserir o `MERCADOPAGO_ACCESS_TOKEN` (Validado e gerando PIX em produção com chave `contato@pinkmusic.com.br`)
- [x] Inserir credenciais Uber Direct: `UBER_CLIENT_ID`, `UBER_CLIENT_SECRET` e `UBER_CUSTOMER_ID`
- [x] Confirmar os dados da loja física (`STORE_ADDRESS`, `STORE_CITY`, `STORE_PHONE`, etc.)

### 2. Configuração de Webhooks (Quando publicar ou via túnel em dev)
- [ ] Cadastrar webhook do Mercado Pago apontando para: `/api/webhooks/mercadopago`
- [ ] Cadastrar webhook do Uber Direct apontando para: `/api/webhooks/uberdirect`

### 3. Testes Práticos (Validação Operacional)
- [x] Realizar um pedido de teste no site gerando o QR Code PIX (Confirmado pelo usuário e funcionando em produção)
- [x] Efetuar pagamento e verificar se o modal avança automaticamente para "Pago com sucesso"
- [x] Verificar decremento do estoque no banco de dados
- [x] Testar cotação em tempo real da API do Uber Direct (Testado com sucesso: status 200, cotação real gerada)
- [x] Modal de cotação e despacho integrado no dashboard `/dashboard/orders`
