# Plano de Segurança do Projeto Pink Music

## Objetivo
Estabelecer uma estratégia e checklist rigoroso de correções para mitigar riscos de autenticação, autorização por papel (RBAC), validação de entrada, vazamento de credenciais e exposição de dados sensíveis.

## Status Geral
- [x] Definir política de autenticação e autorização por papel (RBAC) com `requireAuth()`, `requireStaff()` e `requireAdmin()`
- [x] Proteger rotas sensíveis do backend (produtos, marcas, categorias, parceiros)
- [x] Validar dados de entrada e regras de senha forte no cadastro
- [x] Defender contra força bruta e abuso no login (Rate Limiting)
- [x] Eliminar vazamentos de credenciais e hashes em respostas de API
- [x] Proteger ou internalizar o fluxo de renovação de tokens do Mercado Livre
- [x] Reforçar regras de navegação no middleware para áreas administrativas
- [x] Configurar cabeçalhos HTTP de segurança (Security Headers: HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
- [x] Proteger webhook do Uber Direct com validação de assinatura HMAC
- [x] Adicionar Rate Limiting em rotas sensíveis públicas (cotação de frete e cadastros)
- [x] Limitar e validar uploads de imagens (MIME types estritos e tamanho máx. 5MB)
- [x] Fechar rota órfã `GET /api/getProducts` com `requireAdmin()`

---

## Checklist de Correções por Prioridade

### P0 - Crítico (Segurança de Dados e Acesso Imediato)
- [x] Reforçar autenticação em todas as rotas sensíveis de escrita do backend
- [x] Verificar `role` e permissão em todas as APIs de usuários
- [x] Bloquear listagem pública de usuários (`GET /api/auth/users` restrito a ADMIN sem expor senhas)
- [x] Garantir que `DELETE` em usuários respeite admin ou dono do registro
- [x] Corrigir vazamento de hash de senha no `PUT /api/auth/users/[id]` (remover o campo `password` da resposta JSON)
- [x] Proteger o endpoint `POST /api/refreshToken` com `requireAdmin()` e nunca expor tokens de terceiros para usuários não autenticados
- [x] Internalizar a função `refreshMercadoLivreToken` em módulo compartilhado (`src/lib/mercadolivre.ts`) para evitar chamadas HTTP internas desprotegidas
- [x] **[NOVO]** Validar assinatura criptográfica HMAC-SHA256 (`x-uber-signature`) no webhook do Uber Direct (`src/app/api/webhooks/uberdirect/route.ts`)

### P1 - Alto (Controle de Acesso e Validação)
- [x] Adicionar rate limiting no login (`checkRateLimit` por IP e email)
- [x] Validar email e senha no backend no registro e login
- [x] Exigir senha forte no cadastro (mínimo 8 caracteres, letras e números)
- [x] Garantir que `role: "USER"` seja fixado no cadastro público (evitando elevação de privilégio)
- [x] Restringir acesso a telas administrativas no `src/middleware.ts` para usuários não ADMIN (`/dashboard/products`, `/dashboard/categories`, `/dashboard/brands`, `/dashboard/partners`)
- [x] Ocultar opções administrativas na `Sidebar` para usuários com papel `USER`
- [x] **[NOVO]** Configurar Security Headers no `next.config.ts` (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`)
- [x] **[NOVO]** Proteger rota legada `GET /api/getProducts` com `requireAdmin()` para impedir proxy anônimo usando credenciais da loja

### P2 - Médio (Boas Práticas e Higiene de Segurança)
- [x] Configurar cookies de autenticação com `httpOnly: true`, `secure: true` (em produção) e `sameSite: "lax"`
- [x] **[NOVO]** Adicionar Rate Limiting por IP em `POST /api/delivery/quote` (máx. 15/min) para evitar esgotamento de cotas da Uber
- [x] **[NOVO]** Adicionar Rate Limiting por IP em `POST /api/auth/register-customer` e `POST /api/auth/register` (máx. 5 a cada 15 min) contra criação automatizada de contas
- [x] **[NOVO]** Validação estrita de tipo MIME (`image/jpeg`, `image/png`, `image/webp`) e limite de 5MB no upload (`src/app/api/upload/route.ts`)
- [x] **[NOVO]** Padronizar Route Handler de usuários para `route.ts` (renomeado de `route.tsx`)
- [x] Remover logs verbosos de `error.stack` em endpoints de produção (ex: `partners/route.ts`)

### P3 - Melhorias Futuras e Monitoramento
- [ ] Migrar armazenamento do rate limiting em memória para Redis/Upstash (para deploy serverless/multi-instância)
- [ ] Implementar auditoria de logs para tentativas de login suspeitas e ações de escrita
- [ ] Criar testes automatizados de segurança (testar 401/403 em endpoints protegidos)
- [ ] Implementar rotação automática periódica do segredo JWT

---

## Detalhamento das Novas Correções Aplicadas

### 1. Proteção do Webhook Uber Direct
- **Arquivo**: `src/app/api/webhooks/uberdirect/route.ts`
- **Ação**: Implementada validação de assinatura `x-uber-signature` via `crypto.timingSafeEqual` com chave secreta `UBER_WEBHOOK_SECRET` ou `UBER_CLIENT_SECRET`. Requisições não assinadas ou adulteradas são rejeitadas com HTTP 401.

### 2. Fechamento da Rota `GET /api/getProducts`
- **Arquivo**: `src/app/api/getProducts/route.ts`
- **Ação**: Adicionada validação `await requireAdmin(req)`. A rota agora não pode ser acessada anonimamente pela internet.

### 3. Cabeçalhos HTTP de Segurança
- **Arquivo**: `next.config.ts`
- **Ação**: Injetados cabeçalhos globais de segurança:
  - `X-Frame-Options: DENY` (anti-Clickjacking no checkout/login)
  - `X-Content-Type-Options: nosniff` (anti-MIME Sniffing)
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` (HSTS)

### 4. Rate Limiting em Endpoints Públicos
- **Arquivo**: `src/lib/authValidation.ts`
- **Ação**: Criada a função `checkCustomRateLimit(request, actionKey, maxAttempts, windowMs)` e aplicada em:
  - `src/app/api/delivery/quote/route.ts`: 15 cotações/minuto por IP.
  - `src/app/api/auth/register-customer/route.ts`: 5 cadastros/15 min por IP.
  - `src/app/api/auth/register/route.ts`: 5 cadastros/15 min por IP.

### 5. Validação Estrita de Upload de Arquivos
- **Arquivo**: `src/app/api/upload/route.ts`
- **Ação**: Adicionada verificação de tamanho máximo de 5MB e restrição de MIME types permitidos estritamente a `image/jpeg`, `image/png` e `image/webp`.

### 6. Padronização de Route Handler
- **Arquivo**: `src/app/api/auth/users/[id]/route.ts`
- **Ação**: Renomeado de `.tsx` para `.ts` conforme as diretrizes do Next.js App Router.
