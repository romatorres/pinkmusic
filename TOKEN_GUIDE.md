# Guia de Renovação de Token Mercado Livre - Pink Music

Este guia explica como renovar manualmente o acesso à API do Mercado Livre caso a renovação automática falhe.

## Link do Mercado Livre Developers para acessar Meus Aplicativos

- `https://developers.mercadolivre.com.br/devcenter`

## Dados da sua Aplicação

- **Client ID:** `292503393972257`
- **Redirect URI:** `https://www.pinkmusic.com.br`
- **Client Secret:** (Confira no arquivo `.env` ou no painel do ML)

---

## Passo 1: Gerar o Código de Autorização

1. Copie e cole a URL abaixo no seu navegador (estando logado na conta do Mercado Livre da loja):
   `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=292503393972257&redirect_uri=https://www.pinkmusic.com.br`

2. Clique em **Permitir** ou **Autorizar**.

3. Você será redirecionado para o seu site. **Não importa se o site der erro ao carregar**, olhe para a barra de endereços do navegador e copie o código que vem depois de `code=`.
   - Exemplo: `TG-67b613946a4804000108608e-247712154`

---

## Passo 2: Obter os Tokens Finais

Com o código `TG` em mãos (ele expira em 5 minutos!), use o terminal (PowerShell ou Bash) para rodar o comando abaixo, substituindo `SEU_CLIENT_SECRET` e `O_CODIGO_TG_COPIADO`:

```powershell
curl -X POST "https://api.mercadolibre.com/oauth/token" `
     -H "Content-Type: application/x-www-form-urlencoded" `
     -d "grant_type=authorization_code" `
     -d "client_id=292503393972257" `
     -d "client_secret=SEU_CLIENT_SECRET" `
     -d "code=O_CODIGO_TG_COPIADO" `
     -d "redirect_uri=https://www.pinkmusic.com.br"
```

O resultado será um JSON. Você precisará do `refresh_token` que vier nele.

---

## Passo 3: Atualizar o Projeto

1. Abra o arquivo **`.env`** (local) e as **Environment Variables** (na Vercel).
2. Atualize o campo `MERCADOLIBRE_REFRESH_TOKEN` com o novo valor.
3. Se estiver testando localmente e o erro persistir, limpe os tokens antigos do banco de dados para forçar o sistema a ler o novo `.env`:

   **Comando para limpar o banco (Terminal):**

   ```bash
   npx prisma db execute --stdin
   DELETE FROM "SystemSetting" WHERE key IN ('MERCADOLIBRE_ACCESS_TOKEN', 'MERCADOLIBRE_REFRESH_TOKEN');
   ```

---

## Dica de Ouro

O sistema que implementamos agora salva os tokens no banco de dados automaticamente. Isso significa que, enquanto a loja tiver acessos regulares, o token se renovará sozinho para sempre. Este tutorial é apenas para "emergências" caso o app fique inativo por muito tempo.
