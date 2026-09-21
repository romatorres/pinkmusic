# Plano de Implementação: Separação de Estoque Local vs. Mercado Livre

Este documento detalha o plano arquitetural para permitir a venda e gestão de estoque de produtos locais (acessórios, cordas, peles, baquetas) convivendo harmonicamente com a vitrine de produtos do Mercado Livre, com suporte visual integrado e preparação para pagamentos via PIX.

---

## 1. Visão Geral da Arquitetura

Atualmente, todos os produtos no banco dependem de uma estrutura espelho da API do Mercado Livre (`permalink` único obrigatório e carregamento de dados do endpoint `/items/{id}`). 

Vamos transformar a aplicação em uma **plataforma híbrida**:
1. **Origem do Produto (`origin`):** Cada produto terá uma origem identificada (`MERCADO_LIVRE` ou `LOCAL`).
2. **Estoque e Atributos:** Produtos locais terão estoque gerenciado diretamente pelo painel administrativo da Pink Music.
3. **Vitrine Unificada:** Os clientes navegarão por todos os produtos juntos (com filtros de categoria e marca), mas com identificação visual clara de disponibilidade imediata.
4. **Fluxo de Compra Dinâmico:** O botão de compra se comportará conforme a modalidade do item (link externo do ML vs. fluxo de compra local/PIX).

---

## 2. Fases do Projeto

### Fase 1: Modelagem e Banco de Dados (Prisma & APIs)
- Atualizar o [schema.prisma](file:///c:/Web/pinkmusic/prisma/schema.prisma):
  - Criar enum `ProductOrigin { MERCADO_LIVRE, LOCAL }`.
  - Tornar `permalink` opcional (`String?`).
  - Adicionar campo `origin` com default `MERCADO_LIVRE` (garante 100% de compatibilidade retroativa).
  - Adicionar campos úteis para itens locais: `description String?`, `isLocalPickup Boolean @default(true)`.
  - Gerar e aplicar a migração sem perda de dados.
- Atualizar as definições em [src/lib/types.ts](file:///c:/Web/pinkmusic/src/lib/types.ts).
- Atualizar a rota [src/app/api/products/[id]/route.ts](file:///c:/Web/pinkmusic/src/app/api/products/[id]/route.ts):
  - Se `origin === 'LOCAL'`, buscar direto do banco e pular a consulta à API do Mercado Livre.
- Criar endpoint `POST /api/products/local` para cadastro e edição de produtos locais.

---

### Fase 2: Gestão no Dashboard (`/dashboard/products`)
- **Identificação Visual na Tabela:** Adicionar badges nas linhas da tabela de produtos:
  - 🟡 `Mercado Livre`
  - 🟢 `Estoque Local`
- **Novo Modal / Formulário "Cadastrar Produto Local":**
  - Título, Preço, Quantidade em Estoque, Marca, Categoria, Descrição e Imagem/Galeria.
- **Ajuste Rápido de Estoque Local:**
  - Permitir aumentar/diminuir o estoque de itens locais com facilidade no painel.
- **Filtro por Origem:** Opção de filtrar a tabela por "Todos", "Apenas Mercado Livre" ou "Apenas Estoque Local".

---

### Fase 3: Vitrine e Página do Produto (Experiência do Cliente)
- **Nos Cards de Produto ([ProductCard.tsx](file:///c:/Web/pinkmusic/src/components/site/Products/ProductCard.tsx)):**
  - Selo visual de destaque nos itens locais: *"Pronta Entrega / Retirada no Balcão"*.
  - Ação do botão:
    - Se Mercado Livre: "Comprar" (redireciona para o ML).
    - Se Local: "Ver Detalhes / Comprar" (leva para a página interna).
- **Na Página de Detalhes ([ProductDetails.tsx](file:///c:/Web/pinkmusic/src/components/site/Products/ProductDetails.tsx)):**
  - Se for Mercado Livre: mantém botão *"Comprar no MercadoLivre"*.
  - Se for Local: exibe botão de destaque com as opções locais (ex: *"Pagar com PIX"* ou *"Reservar para Retirada no Balcão"*).
  - Exibição de descrição personalizada cadastrada para o produto local.

---

### Fase 4: Pagamento PIX e Checkout Local
- **Modal / Fluxo de Checkout PIX:**
  - O cliente informa nome, WhatsApp e seleciona: **Retirar na Loja** ou **Entrega Local**.
  - Integração com a API do Mercado Pago (via Pix Instantâneo / QR Code & Copia e Cola) ou exibição de Chave Pix com confirmação de pedido.
  - Ao confirmar o pagamento/pedido, decrementa automaticamente a quantidade disponível no banco de dados.

---

## 3. Arquivos Envolvidos

### [MODIFY] [schema.prisma](file:///c:/Web/pinkmusic/prisma/schema.prisma)
- Adicionar `enum ProductOrigin`.
- Alterar campos em `model Product`.

### [MODIFY] [src/lib/types.ts](file:///c:/Web/pinkmusic/src/lib/types.ts)
- Adicionar `origin`, `description`, `isLocalPickup` no tipo `Product`.

### [MODIFY] [src/app/api/products/[id]/route.ts](file:///c:/Web/pinkmusic/src/app/api/products/[id]/route.ts)
- Tratar busca de produto sem disparar requisição ao ML caso a origem seja `LOCAL`.

### [NEW] `src/app/api/products/local/route.ts`
- Endpoint para criar produtos com origem `LOCAL`.

### [MODIFY] [src/app/dashboard/products/page.tsx](file:///c:/Web/pinkmusic/src/app/dashboard/products/page.tsx)
- Exibir badge de origem e botão "Cadastrar Produto Local".

### [NEW] `src/app/dashboard/products/_components/LocalProductModal.tsx`
- Modal de formulário específico para produtos do estoque local.

### [MODIFY] [src/components/site/Products/ProductCard.tsx](file:///c:/Web/pinkmusic/src/components/site/Products/ProductCard.tsx)
- Badge de pronta entrega e tratamento do clique de compra.

### [MODIFY] [src/components/site/Products/ProductDetails.tsx](file:///c:/Web/pinkmusic/src/components/site/Products/ProductDetails.tsx)
- Botão de compra condicional (ML vs. Venda Local / PIX).

---

## 4. Plano de Verificação e Validação

### Testes Manuais & Funcionais
1. **Compatibilidade dos Produtos Atuais:**
   - Verificar se todos os produtos existentes do Mercado Livre continuam funcionando normalmente na vitrine, na busca e no painel.
2. **Cadastro de Produto Local:**
   - Cadastrar um produto de teste (ex: "Encordoamento Giannini Guitarra 0.10", Preço R$ 38,00, Estoque 10 un).
3. **Exibição na Vitrine:**
   - Conferir se o produto local aparece junto com os demais produtos na Home e em `/products-all`.
   - Verificar se as tags e badges visuais são exibidas corretamente.
4. **Comportamento dos Botões:**
   - Testar o clique no botão de compra do item do Mercado Livre (continua abrindo o ML).
   - Testar o clique no botão do item local (abre o fluxo interno de compra/PIX).
