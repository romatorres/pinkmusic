# IMPLEMENTAÇÃO DE NOTIFICAÇÕES PUSH COM FIREBASE CLOUD MESSAGING

## 1. Objetivo

Implementar um sistema completo de notificações push para os administradores e vendedores de uma loja virtual desenvolvida em Next.js.

Quando um pedido tiver seu pagamento confirmado, o sistema deverá enviar automaticamente uma notificação push aos dispositivos cadastrados dos vendedores.

A notificação deve funcionar mesmo quando o painel administrativo estiver fechado, desde que o navegador, o sistema operacional e as permissões do dispositivo permitam a entrega.

Ao clicar na notificação, o vendedor deverá ser direcionado à página de detalhes do pedido no dashboard.

**Requisitos principais:**

- Não utilizar VPS adicional.
- Não utilizar WhatsApp, Telegram ou serviços pagos de notificação.
- Utilizar Firebase Cloud Messaging (FCM).
- Utilizar o backend existente do Next.js para enviar notificações.
- Armazenar tokens dos dispositivos no PostgreSQL via Prisma.
- Permitir múltiplos dispositivos por vendedor.
- Respeitar autenticação e permissões existentes.
- Manter compatibilidade com Vercel.
- Não modificar desnecessariamente a arquitetura atual.

## 2. Stack atual

O projeto utiliza:

- Next.js 15.5.7 com App Router
- React 19.1.0
- TypeScript 5
- Prisma ORM 6.18.0
- PostgreSQL
- Tailwind CSS 4
- shadcn/ui e Radix UI
- Lucide React
- Sonner para notificações visuais
- Zustand para estados globais
- Zod 4 para validação
- Vercel para hospedagem

Utilizar os padrões existentes no projeto.

Não atualizar versões de dependências sem necessidade.

Instalar somente as dependências adicionais necessárias:

```bash
npm install firebase firebase-admin
```

Não utilizar Firebase Authentication nem Firestore. O Firebase será utilizado exclusivamente para envio e recebimento de notificações push.

## 3. Análise inicial obrigatória

Antes de implementar, inspecionar o código existente e identificar:

1. A estrutura do App Router.
2. O sistema de autenticação atual.
3. Como os usuários e administradores são identificados.
4. Os modelos Prisma de usuários e pedidos.
5. Onde o pagamento PIX é confirmado.
6. Se existe webhook do provedor de pagamento.
7. Onde os pedidos são exibidos no dashboard.
8. Se o projeto já possui `manifest.webmanifest`, service worker ou estrutura PWA.
9. Se existe algum sistema de notificações implementado.

Não presumir nomes de tabelas, rotas, campos ou bibliotecas de autenticação.

Apresentar um resumo da integração antes de modificar o código e reutilizar a estrutura existente sempre que possível.

## 4. Configuração do Firebase

Criar a integração com Firebase Cloud Messaging utilizando dois módulos separados.

**Firebase Client SDK**

Responsável por:

- Inicializar o Firebase no navegador.
- Verificar compatibilidade com FCM.
- Solicitar permissão de notificações.
- Obter o token FCM do navegador.
- Registrar o token no backend.
- Receber mensagens enquanto o dashboard estiver aberto.

**Firebase Admin SDK**

Responsável por:

- Autenticar com o Firebase utilizando uma service account.
- Enviar mensagens push.
- Enviar notificações para múltiplos dispositivos.
- Processar resultados e tokens inválidos.

O Firebase Admin SDK deverá executar exclusivamente no servidor, em ambiente Node.js.

Criar os módulos sugeridos:

```text
src/
  lib/
    firebase/
      client.ts
      admin.ts
      notifications.ts
```

Utilizar inicialização singleton para evitar múltiplas instâncias durante o desenvolvimento.

Não importar Firebase Admin SDK em componentes client.

## 5. Variáveis de ambiente

Preparar as seguintes variáveis:

```env
# Firebase Client
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_VAPID_KEY=

# Firebase Admin - somente servidor
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

Tratar corretamente as quebras de linha da chave privada.

Nunca expor a chave privada em variáveis `NEXT_PUBLIC_`, respostas de API ou logs.

Adicionar instruções de configuração das variáveis na Vercel.

Validar as variáveis necessárias e apresentar erros claros quando estiverem ausentes.

## 6. Banco de dados Prisma

Criar um modelo para armazenar os dispositivos registrados.

Modelo conceitual:

```prisma
model PushSubscription {
  id         String   @id @default(cuid())
  userId     String
  token      String   @unique @db.Text
  deviceName String?
  userAgent  String?
  enabled    Boolean  @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([userId])
}
```

Ajustar o tipo de `userId` e adicionar a relação com o modelo de usuário existente, se aplicável.

Não modificar indevidamente os modelos atuais.

A estrutura deve permitir:

- Um vendedor com vários dispositivos.
- Vários vendedores recebendo notificações.
- Atualização de tokens.
- Desativação de dispositivos.
- Remoção de tokens inválidos.
- Transferência segura de um token para o usuário autenticado correto, quando necessário.

Utilizar Prisma Client existente e criar a migration apropriada.

Não executar `prisma db push` em produção sem avaliar o fluxo de migrations do projeto.

## 7. Registro de dispositivos

Criar endpoints protegidos para registrar e remover dispositivos.

Rotas sugeridas:

```text
POST   /api/push/subscribe
DELETE /api/push/unsubscribe
GET    /api/push/devices
```

Todos os endpoints devem validar a sessão do usuário utilizando a autenticação já existente.

Nunca confiar em um `userId` fornecido pelo navegador.

O identificador do usuário deve ser obtido diretamente da sessão autenticada.

Apenas usuários com permissão administrativa ou de vendedor poderão cadastrar dispositivos para notificações de vendas.

Validar entradas com Zod.

O registro de um token existente deve ser idempotente.

O endpoint de remoção deve permitir desativar apenas dispositivos pertencentes ao usuário autenticado, exceto quando houver uma regra administrativa explícita.

## 8. Service Worker

Implementar um service worker para receber mensagens do Firebase Cloud Messaging em segundo plano.

Arquivo sugerido:

```text
public/firebase-messaging-sw.js
```

Requisitos:

- Compatibilidade com Firebase Cloud Messaging Web SDK.
- Receber notificações quando o dashboard não estiver aberto.
- Exibir título, descrição e ícone da loja.
- Suportar clique na notificação.
- Abrir ou focar a aba correspondente ao pedido.
- Evitar notificações duplicadas.
- Não utilizar service worker de desenvolvimento incompatível com produção.
- Não substituir um service worker existente sem analisar sua função.

Se utilizar scripts Firebase via `importScripts`, escolher uma versão compatível e documentar a estratégia.

Não inserir credenciais privadas no service worker.

O link do pedido deve ser uma rota interna validada, nunca uma URL arbitrária fornecida pelo cliente.

Se o projeto já possuir PWA, integrar o FCM à estrutura existente.

## 9. Interface no dashboard

Adicionar uma seção de notificações nas configurações do dashboard.

Sugestão visual:

**Notificações de vendas**

Receba alertas no celular quando uma nova venda for confirmada.

[Ativar notificações]

Status: Ativadas / Desativadas / Bloqueadas / Não suportadas

[Testar notificação]

Utilizar os componentes shadcn/ui já existentes e ícones Lucide React.

Requisitos:

- Solicitar permissão somente após ação explícita do usuário.
- Exibir estado de carregamento.
- Utilizar Sonner para mensagens de sucesso e erro.
- Exibir instruções quando as notificações estiverem bloqueadas.
- Não solicitar permissão repetidamente a cada carregamento.
- Registrar e atualizar o token após a autorização.
- Permitir desativar as notificações do dispositivo.
- Apresentar uma lista simples dos dispositivos cadastrados, se viável.

No iPhone, identificar quando o site não estiver executando como aplicativo instalado na Tela de Início e apresentar orientações para adicioná-lo.

Não tentar solicitar permissão de notificações no iOS antes que os requisitos de instalação e interação do usuário sejam atendidos.

## 10. Integração com pagamento confirmado

Esta é a parte mais importante.

Localizar no projeto o ponto em que um pedido passa para o status de pagamento confirmado.

Integrar o disparo de notificações nesse fluxo.

Exemplo conceitual:

```typescript
await confirmarPagamento(pedidoId);

await notificarNovaVenda(pedidoId);
```

Esse exemplo representa apenas a sequência lógica. Adaptar à arquitetura real.

Regras obrigatórias:

1. Nunca notificar simplesmente porque o cliente abriu a página de sucesso.
2. Notificar somente após confirmação confiável do provedor de pagamento.
3. Validar autenticidade do webhook.
4. Garantir idempotência.
5. Não disparar duas notificações para o mesmo evento de confirmação.
6. Não permitir que uma falha do Firebase desfaça um pagamento confirmado.
7. Registrar erros de envio para diagnóstico.
8. Não expor informações sensíveis dos pedidos nas notificações.

Para maior confiabilidade, avaliar uma tabela de eventos de notificação com chave única por pedido e tipo de evento.

Como a hospedagem utiliza Vercel, não depender de tarefas em segundo plano executadas depois do encerramento da requisição sem um mecanismo confiável de execução.

Priorizar uma solução simples, mas que permita reprocessar falhas sem duplicar notificações.

## 11. Conteúdo da notificação

Quando um pagamento for confirmado, enviar uma notificação semelhante a:

**Título:**
🛒 Nova venda confirmada!

**Mensagem:**
Pedido #1058 — R$ 189,90

**Dados adicionais:**

```json
{
  "type": "ORDER_CONFIRMED",
  "orderId": "1058",
  "url": "/dashboard/orders/1058"
}
```

A URL deve ser adaptada à rota real do projeto.

O identificador do pedido deve ser tratado como string e validado.

Ao tocar na notificação:

- Abrir o dashboard.
- Direcionar para o pedido correspondente.
- Solicitar login caso a sessão tenha expirado.
- Aplicar as permissões normais de acesso ao pedido.

Não incluir endereço completo, telefone ou informações pessoais desnecessárias no push.

## 12. Serviço centralizado de notificações

Criar uma função reutilizável:

```typescript
async function notifyOrderConfirmed(orderId: string): Promise<void>;
```

Essa função deverá:

1. Buscar o pedido no banco.
2. Confirmar que está efetivamente pago.
3. Identificar os vendedores autorizados.
4. Buscar os tokens FCM ativos desses usuários.
5. Preparar a mensagem.
6. Enviar utilizando Firebase Admin SDK.
7. Processar os resultados por token.
8. Desativar tokens comprovadamente inválidos.
9. Registrar falhas sem afetar o pedido.

Utilizar envio multicast ou estratégia equivalente suportada pelo Firebase Admin SDK instalado.

Não remover tokens por erros temporários de rede, limite de envio ou indisponibilidade do Firebase.

Separar a lógica de envio da lógica de atualização do pedido.

## 13. Endpoint de teste

Criar:

```text
POST /api/push/test
```

Esse endpoint deve:

- Exigir autenticação.
- Verificar permissão administrativa ou de vendedor.
- Enviar uma notificação somente para os dispositivos do usuário autenticado.
- Não alterar pedidos.
- Retornar um resultado resumido.
- Possuir proteção contra chamadas excessivas.

Mensagem de teste:

**Pink Music — Notificações ativadas**

Seu dispositivo está pronto para receber alertas de novas vendas.

Adicionar um botão de teste na interface de configurações.

## 14. Notificações com dashboard aberto

Quando o usuário estiver com o dashboard aberto, utilizar o listener do Firebase para receber mensagens em primeiro plano.

Exibir um toast Sonner com:

- Título da notificação.
- Número do pedido.
- Valor.
- Ação para visualizar o pedido.

Evitar que o mesmo evento gere simultaneamente toast e notificação do sistema sem necessidade.

Remover listeners ao desmontar componentes para evitar registros duplicados.

## 15. Compatibilidade com dispositivos

Implementar verificações de suporte antes de tentar inicializar o FCM.

Considerar:

**Android**

- Navegadores compatíveis com Firebase Messaging.
- Permissão de notificações.
- Recebimento em segundo plano.

**iPhone**

- iOS/iPadOS 16.4 ou superior para Web Push de aplicativos web instalados.
- Instalação do site na Tela de Início.
- Abertura pelo ícone instalado.
- Permissão solicitada após interação do usuário.
- Tratamento de dispositivos e navegadores não compatíveis.

**Desktop**

- Chrome, Edge e outros navegadores compatíveis.
- Permissão do navegador e sistema operacional.

Não prometer entrega garantida: a disponibilidade depende das configurações do dispositivo, conectividade e políticas do sistema operacional.

## 16. Segurança

Aplicar as seguintes proteções:

- Tokens associados a usuários autenticados.
- Endpoints protegidos.
- Validação de permissões.
- Firebase Admin apenas no servidor.
- Credenciais privadas em variáveis de ambiente.
- Nenhuma chave privada no navegador.
- URLs de notificação restritas a rotas internas.
- Proteção contra disparos repetidos.
- Logs sem tokens completos ou dados sensíveis.
- Remoção de dispositivos inativos.
- Tratamento de logout para evitar notificações de vendas em dispositivos compartilhados.

## 17. Organização sugerida

Ajustar a estrutura conforme o projeto real:

```text
src/
  app/
    api/
      push/
        subscribe/
          route.ts
        unsubscribe/
          route.ts
        devices/
          route.ts
        test/
          route.ts

  components/
    notifications/
      PushNotificationSettings.tsx
      PushNotificationListener.tsx

  hooks/
    usePushNotifications.ts

  lib/
    firebase/
      client.ts
      admin.ts
      notifications.ts

public/
  firebase-messaging-sw.js
  manifest.webmanifest
```

Criar `manifest.webmanifest` apenas se ainda não existir e se for necessário para a instalação PWA.

Não sobrescrever arquivos existentes sem verificar seu conteúdo.

## 18. Testes obrigatórios

Testar os seguintes cenários:

1. Ativar notificações no desktop.
2. Enviar uma notificação de teste.
3. Receber notificação com dashboard aberto.
4. Receber notificação com dashboard fechado.
5. Clicar e abrir o pedido.
6. Registrar dois dispositivos para o mesmo vendedor.
7. Confirmar um pagamento PIX.
8. Garantir que somente vendedores autorizados sejam notificados.
9. Receber webhook duplicado sem gerar duas notificações.
10. Desativar notificações.
11. Testar sessão expirada.
12. Testar falha temporária no Firebase.
13. Testar dispositivo com permissão bloqueada.
14. Validar build de produção na Vercel.

## 19. Entrega esperada

Ao finalizar:

- Apresentar os arquivos criados e modificados.
- Explicar as alterações no Prisma.
- Informar os comandos de instalação e migration.
- Informar como configurar o projeto Firebase.
- Explicar como obter a chave VAPID.
- Explicar como obter as credenciais da service account.
- Listar as variáveis de ambiente para Vercel.
- Demonstrar onde a notificação foi conectada à confirmação PIX.
- Explicar como ativar notificações no Android e iPhone.
- Informar limitações de navegadores e sistemas operacionais.
- Executar verificações de TypeScript, lint e build quando possível.

**Importante:** implementar por etapas, preservando o funcionamento da loja. Não modificar o checkout, o pagamento ou a autenticação além do necessário para integrar as notificações.

Se faltar alguma informação do projeto, inspecionar os arquivos antes de tomar decisões. Não criar implementações paralelas de funcionalidades que já existem.
