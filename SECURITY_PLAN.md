# Plano de segurança do projeto Pink Music

## Objetivo
Estabelecer um checklist de correções para reduzir riscos de autenticação, autorização, validação e exposição de dados.

## Status geral
- [x] Definir política de autenticação e autorização por papel (RBAC)
- [x] Proteger rotas sensíveis do backend
- [x] Validar dados de entrada e regras de senha
- [x] Defender contra brute force e abuso de login
- [ ] Revisar cookies e proteção contra CSRF
- [ ] Reduzir exposição de dados em APIs

---

## Checklist de correções por prioridade

### P0 - Crítico
- [x] Reforçar autenticação em todas as rotas sensíveis do backend
- [x] Verificar `role` e permissão em todas as APIs de usuários
- [x] Bloquear listagem pública de usuários
- [x] Garantir que `PUT`/`DELETE` em usuários respeitem admin ou dono do registro
- [x] Proteger endpoints administrativos com autorização real no servidor
- [x] Validar e controlar acesso aos endpoints de produtos e dashboards

### P1 - Alto
- [ ] Adicionar rate limiting no login
- [ ] Validar email e senha no backend no registro/login
- [ ] Exigir senha forte no cadastro
- [ ] Padronizar respostas de erro sem expor detalhes internos
- [ ] Revisar todas as rotas da pasta `src/app/api` para permissionamento correto
- [ ] Garantir que o dashboard não dependa apenas de UI para esconder acesso

### P2 - Médio
- [ ] Revisar cookies de autenticação (`httpOnly`, `secure`, `sameSite`)
- [ ] Adicionar proteção CSRF para ações mutáveis
- [ ] Revisar uso de `console.error` em produção e reduzir logs sensíveis
- [ ] Centralizar utilitários de autorização em um único local
- [ ] Documentar as regras de acesso por role no projeto

### P3 - Melhorias futuras
- [ ] Usar refresh token separado, se o sistema crescer
- [ ] Adicionar monitoramento de falhas e tentativas de login
- [ ] Criar testes automatizados de segurança para rotas críticas
- [ ] Revisar dados expostos em JSON e respostas internas

---

## Riscos mapeados no código atual

### 1. Autorização insuficiente em rotas de usuário
- Arquivo: `src/app/api/auth/users/route.ts`
- Arquivo: `src/app/api/auth/users/[id]/route.tsx`
- Problema: qualquer usuário autenticado pode potencialmente alterar ou listar usuários
- Ação: exigir `role === "ADMIN"` ou ownership no backend

### 2. Middleware sem checagem de role
- Arquivo: `src/middleware.ts`
- Problema: valida apenas se há token; não verifica papel
- Ação: validar role para dashboard e áreas administrativas

### 3. Login sem limitador de tentativa
- Arquivo: `src/app/api/auth/login/route.ts`
- Problema: brute force possível
- Ação: implementar rate limiting por IP/usuário

### 4. Registro sem validação forte de senha
- Arquivo: `src/app/api/auth/register/route.ts`
- Problema: pode aceitar senha fraca e dados incompletos
- Ação: aplicar regras mínimas e normalização backend

### 5. Cookies sem reforço de segurança absoluta
- Arquivo: `src/app/api/auth/login/route.ts`
- Problema: `sameSite: "lax"` pode ser insuficiente para mecanismos mais rígidos
- Ação: revisar políticas e considerar CSRF para ações críticas

---

## Plano de execução por etapa

### Etapa 1 - Base de autorização
- [x] Criar helper `requireAuth()`
- [x] Criar helper `requireAdmin()`
- [x] Criar helper `requireUserOrAdmin(userId)`
- [x] Aplicar em rotas de usuário e dashboard

### Etapa 2 - Proteger listagem de usuários
- [x] Bloquear `GET /api/auth/users`
- [x] Permitir somente admin
- [x] Validar token antes da listagem

### Etapa 3 - Proteger edição/deleção de usuários
- [x] Verificar token
- [x] Confirmar `userId` do token
- [x] Permitir apenas admin ou dono do registro
- [x] Responder 403 em caso de não autorização

### Etapa 4 - Login seguro
- [x] Adicionar rate limiting
- [x] Aplicar validação adicional de email/senha
- [x] Registrar tentativas e bloquear por excesso

### Etapa 5 - Registro seguro
- [x] Exigir senha forte
- [x] Normalizar email em lowercase
- [x] Validar duplicidade de forma robusta

### Etapa 6 - CSRF e cookies
- [ ] Revisar configurações de cookie
- [ ] Implementar proteção para rotas mutáveis
- [ ] Validar fluxo de requests do cliente

### Etapa 7 - Auditoria e testes
- [ ] Criar testes de API para rota de login
- [ ] Criar testes de autorização para usuários
- [ ] Criar testes para rotas administrativas
- [ ] Validar regressões após cada correção

---

## Observações finais
Este plano deve ser executado em pequenas entregas. A prioridade é fixar a autorização real no backend antes de mexer em UX ou melhorias cosméticas.

O objetivo principal é garantir que a regra de acesso esteja no servidor e não apenas na interface.
