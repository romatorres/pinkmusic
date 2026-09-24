# 📋 Checklist de Implementação: Carrinho de Compras & Login do Cliente

Este documento lista todas as etapas concluídas para transformar o fluxo de compras da Pink Music em um e-commerce completo com múltiplos produtos, identificação obrigatória do cliente antes do checkout e gestão avançada de pedidos e logística.

---

## 🗄️ Fase 1: Banco de Dados e Modelagem (Prisma)
- [x] **1.1** Adicionar campo `phone` (WhatsApp) no model `User`
- [x] **1.2** Criar model `OrderItem` para guardar múltiplos produtos por pedido:
  - `id`, `orderId`, `productId`, `title`, `price`, `quantity`, `thumbnail`, `productCode`
- [x] **1.3** Atualizar model `Order`:
  - Adicionar relação `items OrderItem[]`
  - Adicionar `userId String?` e relação `user User?`
  - Tornar `productId String?` opcional para compatibilidade com pedidos anteriores
- [x] **1.4** Gerar migração `20260924100540_add_cart_user_orderitems` e sincronizar com o banco

---

## 🛒 Fase 2: Gerenciamento de Estado do Carrinho (Zustand)
- [x] **2.1** Criar store `useCartStore.ts` com persistência em `localStorage`
- [x] **2.2** Implementar ações do carrinho:
  - `addItem(product, quantity)`: Adiciona ou incrementa se já existir
  - `updateQuantity(productId, quantity)`: Altera quantidade com validação de estoque
  - `removeItem(productId)`: Remove produto específico
  - `clearCart()`: Limpa o carrinho após compra finalizada
  - `openCart/closeCart/toggleCart()`: Controle de abertura do drawer
- [x] **2.3** Implementar seletores de cálculo:
  - `itemsCount`: Total de unidades no carrinho (para o badge do Header)
  - `subtotal`: Valor total somado dos produtos
  - `consolidatedPackageSize`: Cálculo do maior porte entre os itens para entrega Uber Direct

---

## 🎨 Fase 3: Interface do Carrinho (UI / UX)
- [x] **3.1** Criar componente `CartDrawer.tsx` (gaveta lateral deslizante):
  - Lista dos itens adicionados com imagem, título, código fiscal, preço e controle `[-] Qtd [+]`
  - Botão de remover item
  - Resumo de valores (subtotal)
  - Botão de ação: **"Finalizar Pedido"** (intercepta para login se não autenticado)
  - Estado vazio amigável com botão "Continuar Comprando"
- [x] **3.2** Atualizar o [Header.tsx](file:///c:/Web/pinkmusic/src/components/site/Header.tsx):
  - Conectar o ícone `<ShoppingCart />` para abrir o `CartDrawer`
  - Badge numérico dinâmico no ícone com o total de itens
  - Menu dropdown do usuário (logado/deslogado)
  - Carrega usuário autenticado ao inicializar
- [x] **3.3** Atualizar [ProductDetails.tsx](file:///c:/Web/pinkmusic/src/components/site/Products/ProductDetails.tsx):
  - Botão **"Adicionar ao Carrinho"** com feedback visual (animação de check verde)
  - Botão **"Comprar Agora via PIX"** (adiciona ao carrinho e abre checkout)
- [x] **3.4** Atualizar [ProductCard.tsx](file:///c:/Web/pinkmusic/src/components/site/Products/ProductCard.tsx):
  - Botão flutuante `+` (hover) para adição rápida ao carrinho
  - Botão "Adicionar ao Carrinho" inline nos cards da vitrine

---

## 👤 Fase 4: Autenticação do Cliente antes do Checkout
- [x] **4.1** Criar endpoint `POST /api/auth/register-customer`:
  - Campos: Nome completo, WhatsApp/Telefone, E-mail e Senha
  - Criação de usuário com role `USER` e geração automática do cookie JWT (30 dias)
- [x] **4.2** Criar componente [CustomerAuthModal.tsx](file:///c:/Web/pinkmusic/src/components/site/_components/CustomerAuthModal.tsx):
  - Abas: "Entrar" e "Criar Conta"
  - Login e cadastro com validações amigáveis e olho para mostrar/ocultar senha
- [x] **4.3** Interceptador no fluxo de compra:
  - Se clicar em **"Finalizar Pedido"** no carrinho:
    - Se **já logado**: abre direto o `CartCheckoutModal`
    - Se **não logado**: abre o `CustomerAuthModal` e, após login, segue para o checkout
- [x] **4.4** Atualizar ícone de usuário no Header:
  - Deslogado: abre `CustomerAuthModal`
  - Logado: exibe "Olá, [Nome]", dropdown com "Meus Pedidos" e "Sair"

---

## 💳 Fase 5: Checkout com Múltiplos Produtos & Uber Direct
- [x] **5.1** Atualizar endpoint `POST /api/orders`:
  - Receber lista de itens (`items: { productId, quantity }[]`)
  - Validar estoque de todos os itens
  - Salvar o `userId` do cliente autenticado
  - Criar os registros em `OrderItem` vinculados ao pedido
  - Manter compatibilidade com o fluxo legado de produto único
- [x] **5.2** Atualizar cotação do frete (`POST /api/delivery/quote`):
  - Recebe `packageSize` consolidado do carrinho para a Uber Direct
- [x] **5.3** Criar [CartCheckoutModal.tsx](file:///c:/Web/pinkmusic/src/components/site/Products/CartCheckoutModal.tsx):
  - Lista resumida de todos os itens do carrinho com imagem e código fiscal
  - Dados do comprador pré-preenchidos com dados do usuário autenticado
  - Endereço de entrega / Retirada na loja
  - Frete Uber Direct consolidado com badge do porte do envio (moto/carro)
  - Geração de QR Code PIX único com o valor total unificado
  - Confirmação automática via polling + opção de avisar via WhatsApp
  - Limpeza do carrinho no sucesso da compra

---

## 📊 Fase 6: Painel Administrativo de Pedidos & Validações
- [x] **6.1** Atualizar o painel em [orders/page.tsx](file:///c:/Web/pinkmusic/src/app/dashboard/orders/page.tsx):
  - Listar todos os itens contidos em cada pedido (título, código fiscal, quantidade e preço unitário/total)
  - Exibir dados do cliente cadastrado (identificação de usuário com e-mail e link direto para WhatsApp)
  - Modal de despacho Uber Direct com a lista completa do manifesto de itens do pacote
  - Compatibilidade com pedidos legados e novos pedidos de múltiplos itens
- [x] **6.2** Validação final dos fluxos e compilação de produção:
  - Checagem completa de tipos TypeScript (`npx tsc --noEmit` aprovado com 0 erros)
  - Build de produção Next.js (`npm run build` gerado e aprovado com sucesso)
