# Plano de Implementação — Frete Uber Direct no Checkout com Margem de Segurança

## Visão Geral
Implementar o cálculo dinâmico de frete Uber Direct diretamente no modal de compra do cliente (`PixCheckoutModal`), aplicando uma margem de segurança (+ R$ 2,00 com arredondamento para cima), somando o valor do frete ao valor do produto e gerando o QR Code PIX com o total unificado.

---

## Regra de Negócio do Frete com Margem

1. **Cálculo da Uber:** A API retorna o valor da corrida em centavos (ex: `1240` centavos = `R$ 12,40`).
2. **Margem de Segurança:** Adicionamos **R$ 2,00** e arredondamos para o próximo real (ou 50 centavos):
   $$\text{Frete Cobrado} = \lceil \text{Valor Uber} + 2.00 \rceil$$
   *Exemplo:* R$ 12,40 + R$ 2,00 = R$ 14,40 $\rightarrow$ **R$ 15,00 cobrados do cliente no PIX**.
3. **Segurança para a Loja:** Se na hora do despacho o trânsito ou a tarifa dinâmica subir para R$ 13,50 ou R$ 14,00, a loja ainda está coberta pela gordura paga pelo cliente.

---

## Proposta de Mudanças

### 1. Banco de Dados

#### [MODIFY] [schema.prisma](file:///c:/Web/pinkmusic/prisma/schema.prisma)
- Adicionar o campo `deliveryFee Float @default(0)` no model `Order`.
- Executar migração do Prisma para persistir o valor cobrado de frete separadamente do valor do produto.

---

### 2. Backend — Nova API de Cotação Prévia

#### [NEW] [route.ts](file:///c:/Web/pinkmusic/src/app/api/delivery/quote/route.ts)
- `POST /api/delivery/quote`
- Recebe `{ address: string }`.
- Valida o endereço em Feira de Santana.
- Chama `getDeliveryQuote` da biblioteca `src/lib/uberdirect.ts`.
- Aplica a regra de margem (+ R$ 2,00 e arredondamento).
- Retorna:
  ```json
  {
    "success": true,
    "data": {
      "customerFee": 15.00,
      "estimatedMinutes": 48,
      "quoteId": "dqt_..."
    }
  }
  ```

---

### 3. Backend — Criação de Pedido com Frete

#### [MODIFY] [route.ts](file:///c:/Web/pinkmusic/src/app/api/orders/route.ts)
- Receber `deliveryFee` no corpo da requisição.
- Se `deliveryType === "delivery"`, validar e somar:
  $$\text{totalAmount} = (\text{product.price} \times \text{quantity}) + \text{deliveryFee}$$
- Gravar `deliveryFee` e `totalAmount` no banco.
- Chamar `createPixPayment` com o `totalAmount` unificado.

---

### 4. Frontend — Modal de Checkout Reformulado

#### [MODIFY] [PixCheckoutModal.tsx](file:///c:/Web/pinkmusic/src/components/site/Products/PixCheckoutModal.tsx)
- Quando o cliente selecionar **"Entrega Local"**:
  - Exibir campo de endereço com botão **"Calcular Frete"** (ou auto-calcula ao preencher).
  - Enquanto calcula: spinner com *"Consultando Uber Direct..."*.
  - Exibir card com:
    - 🛵 **Entrega Expressa via Uber Direct**
    - Previsão: **~XX minutos**
    - Frete: **R$ XX,00**
  - Discriminativo claro de valores:
    - Subtotal (Produto): `R$ 500,00`
    - Frete Local: `+ R$ 15,00`
    - **Total no PIX: R$ 515,00**
  - O QR Code gerado já reflete o valor de R$ 515,00.

---

### 5. Dashboard Administrativo

#### [MODIFY] [page.tsx](file:///c:/Web/pinkmusic/src/app/dashboard/orders/page.tsx)
- No card do pedido e no modal de despacho:
  - Mostrar o detalhamento: *"Produto: R$ 500,00 | Frete pago pelo cliente: R$ 15,00"*.
  - No modal de despacho Uber Direct, comparar o frete pago pelo cliente com o custo real da corrida no momento do envio.

---

## Plano de Verificação

### Testes Automatizados & Validação
- `npx prisma migrate dev` para atualizar a tabela `Order`.
- `npx tsc --noEmit` para garantir integridade dos tipos TypeScript.
- Teste via script do endpoint `/api/delivery/quote`.

### Teste Manual
1. Abrir um produto no site local ou produção.
2. Clicar em "Comprar com PIX".
3. Selecionar "Entrega Local" e digitar um endereço em Feira de Santana.
4. Validar se o frete da Uber é calculado com a margem (ex: R$ 15,00) e somado no total.
5. Clicar em "Gerar PIX" e confirmar se o QR Code do Mercado Pago é gerado com o valor somado.
6. Acessar `/dashboard/orders` e confirmar que o pedido exibe o frete discriminado.
