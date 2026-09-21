# Plano de Segurança do Projeto Pink Music

## Objetivo
Estabelecer uma estratégia e checklist rigoroso de correções para mitigar riscos de autenticação, autorização por papel (RBAC), validação de entrada, vazamento de credenciais e exposição de dados sensíveis.

## Status Geral
- [x] Definir política de autenticação e autorização por papel (RBAC) com `requireAuth()` e `requireAdmin()`
- [x] Proteger rotas sensíveis do backend (produtos, marcas, categorias, parceiros)
- [x] Validar dados de entrada e regras de senha forte no cadastro
- [x] Defender contra força bruta e abuso no login (Rate Limiting)
- [x] Eliminar vazamentos de credenciais e hashes em respostas de API
- [x] Proteger ou internalizar o fluxo de renovação de tokens do Mercado Livre
- [x] Reforçar regras de navegação no middleware para áreas administrativas
- [ ] Revisar cookies, cabeçalhos de segurança e proteção CSRF

---

## Checklist de Correções por Prioridade

### P0 - Crítico (Segurança de Dados e Acesso Imediato)
- [x] Reforçar autenticação em todas as rotas sensíveis de escrita do backend
- [x] Verificar `role` e permissão em todas as APIs de usuários
- [x] Bloquear listagem pública de usuários (`GET /api/auth/users` restrito a ADMIN sem expor senhas)
- [x] Garantir que `DELETE` em usuários respeite admin ou dono do registro
- [x] **[NOVO]** Corrigir vazamento de hash de senha no `PUT /api/auth/users/[id]` (remover o campo `password` da resposta JSON)
- [x] **[NOVO]** Proteger o endpoint `POST /api/refreshToken` com `requireAdmin()` e nunca expor tokens de terceiros para usuários não autenticados
- [x] **[NOVO]** Internalizar a função `refreshMercadoLivreToken` em módulo compartilhado (`src/lib/mercadolivre.ts`) para evitar chamadas HTTP internas desprotegidas

### P1 - Alto (Controle de Acesso e Validação)
- [x] Adicionar rate limiting no login (`checkRateLimit` por IP e email)
- [x] Validar email e senha no backend no registro e login
- [x] Exigir senha forte no cadastro (mínimo 8 caracteres, letras e números)
- [x] Garantir que `role: "USER"` seja fixado no cadastro público (evitando elevação de privilégio)
- [x] Restringir acesso a telas administrativas no `src/middleware.ts` para usuários não ADMIN (`/dashboard/products`, `/dashboard/categories`, `/dashboard/brands`, `/dashboard/partners`)
- [x] Ocultar opções administrativas na `Sidebar` para usuários com papel `USER`
- [ ] Padronizar respostas de erro de banco de dados sem expor detalhes internos do Prisma/Postgres

### P2 - Médio (Boas Práticas e Higiene de Segurança)
- [x] Configurar cookies de autenticação com `httpOnly: true`, `secure: true` (em produção) e `sameSite: "lax"`
- [ ] Adicionar validação de origem (`Origin` / `Referer`) nas rotas mutáveis (proteção anti-CSRF)
- [x] Remover logs verbosos de `error.stack` em endpoints de produção (ex: `partners/route.ts`)
- [ ] Centralizar lógica de permissão de usuário/admin com helper `requireUserOrAdmin(request, targetUserId)`

### P3 - Melhorias Futuras e Monitoramento
- [ ] Migrar armazenamento do rate limiting em memória para Redis/Upstash (necessário para deploy serverless/multi-instância)
- [ ] Implementar auditoria de logs para tentativas de login suspeitas e ações de escrita
- [ ] Criar testes automatizados de segurança (testar 401/403 em endpoints protegidos)
- [ ] Implementar rotação automática periódica do segredo JWT

---

## Riscos Mapeados e Diagnóstico Detalhado

### 1. Vazamento do Hash de Senha em Edição de Usuário
- **Arquivo**: `src/app/api/auth/users/[id]/route.tsx`
- **Problema**: O endpoint executa `prisma.user.update` e retorna o objeto retornado diretamente no `NextResponse.json(user)`. Como o Prisma inclui todas as colunas por padrão, o hash Bcrypt da senha do usuário é devolvido no corpo da resposta HTTP.
- **Ação**: Utilizar cláusula `select` na query de atualização para retornar estritamente `id`, `name`, `email`, `role`, `createdAt` e `updatedAt`.

### 2. Exposição Pública de Tokens do Mercado Livre
- **Arquivo**: `src/app/api/refreshToken/route.ts`
- **Problema**: O endpoint `POST /api/refreshToken` não possui verificação de sessão (`requireAdmin`). Qualquer requisitante anônimo pode acioná-lo e obter o `accessToken` e `refreshToken` do Mercado Livre na resposta JSON.
- **Ação**: Exigir `requireAdmin(request)` na rota e extrair a lógica para uma função de biblioteca (`src/lib/mercadolivre.ts`), consumida diretamente pelos serviços de produtos sem necessidade de tráfego HTTP exposto.

### 3. Falta de Restrição de Telas Administrativas no Middleware
- **Arquivo**: `src/middleware.ts`
- **Problema**: O middleware protege apenas `/dashboard/register` contra usuários não ADMIN. Usuários cadastrados com papel comum (`USER`) conseguem acessar e visualizar as páginas administrativas (`/dashboard/products`, `/dashboard/partners`, etc.) na interface, gerando frustração ou vazamento de metadados da UI.
- **Ação**: Atualizar o matcher e a checagem no middleware para redirecionar usuários comuns caso tentem acessar páginas exclusivas de administração.

### 4. Chamadas HTTP Internas Redundantes para Renovação de Token
- **Arquivos**: `src/app/api/getProducts/route.ts`, `src/app/api/products/add/route.ts`, `src/app/api/products/[id]/route.ts`
- **Problema**: Cada rota faz `fetch(`${baseUrl}/api/refreshToken`)` disparando uma nova requisição HTTP para a própria aplicação.
- **Ação**: Chamar a função utilitária diretamente no mesmo processo Node.js.

### 5. Sanitização de Erros e Stack Traces
- **Arquivos**: `src/app/api/partners/route.ts`, `src/app/api/products/[id]/route.ts`
- **Problema**: Logs contendo `error.stack` e retornos de erro expondo mensagens internas do Prisma.
- **Ação**: Padronizar respostas amigáveis no formato `{ success: false, error: "..." }` sem expor a stack de execução.

---

## Plano de Execução Imediato

### Etapa 1 - Fechamento de Brechas Críticas (P0)
- [x] Corrigir `PUT /api/auth/users/[id]` para nunca expor `password`.
- [x] Criar `src/lib/mercadolivre.ts` com a função `refreshMercadoLivreToken()`.
- [x] Refatorar `/api/refreshToken` para exigir `requireAdmin(req)`.
- [x] Atualizar as rotas de produtos para usar o utilitário compartilhado diretamente.

### Etapa 2 - Reforço de RBAC no Middleware e Sidebar (P1)
- [x] Atualizar `src/middleware.ts` para proteger rotas administrativas além de `/dashboard/register`.
- [x] Ajustar `Sidebar` para exibir links administrativos apenas se `user.role === "ADMIN"`.

### Etapa 3 - Limpeza de Logs e Sanitização de Erros (P2)
- [x] Tratar `console.error` em rotas públicas para não logar stacks em produção.
- [ ] Validar cabeçalho `Origin` em mutações para proteção complementar contra requisições cruzadas.
