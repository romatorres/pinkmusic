# Plano de Otimização e Cache: Sincronização Mercado Livre (Preço e Estoque)

Este documento descreve a arquitetura atual, o problema de consumo de recursos (Vercel e Prisma IO) e o passo a passo exato para implementar a estratégia de **Cache com Janela de Tempo (Plano A)** para manter os limites gratuitos protegidos com máxima performance.

---

## 1. Contexto e Diagnóstico

### 1.1 O que foi corrigido anteriormente
* **Preço sobrescrito pelo banco:** Em `src/app/api/products/[id]/route.ts`, a linha `price: productFromDb.price` forçava o preço antigo do banco mesmo após buscar o dado fresco na API do Mercado Livre. Isso foi corrigido para usar `mlData.price`.
* **Persistência no banco:** Ao abrir o produto, se houver divergência de preço ou estoque no Mercado Livre (ou se o anúncio estiver pausado/fechado), o sistema agora persiste as alterações no banco com `prisma.product.update`.
* **Sincronização em Lote (Multiget):** Criada a função `syncMercadoLivreProducts()` em `src/lib/mercadolivre.ts` e a rota `POST /api/products/sync-ml`, além do botão *"Sincronizar ML"* no painel administrativo (`src/app/dashboard/products/page.tsx`).

### 1.2 O Desafio de Tráfego e Limites Gratuitos (Vercel + Prisma)
* Sem cache de tempo, **cada visitante ou robô de busca** que acessa a página de um produto faz a *Serverless Function* da Vercel ficar esperando a API externa do Mercado Livre responder (300ms a 1.5s).
* Isso consome tempo de execução de funções (*GB-horas*) na Vercel e pode sobrecarregar conexões no banco Prisma IO além de arriscar bloqueio por *Rate Limit* (HTTP 429) na API do Mercado Livre.

---

## 2. A Solução: Plano A (Cache Inteligente de 30 minutos)

Em vez de chamar a API externa do Mercado Livre a cada requisição, usamos o campo `updatedAt` existente na tabela `Product` do Prisma para determinar se o produto foi sincronizado recentemente:

* Se `agora - productFromDb.updatedAt < 30 minutos`:
  * **Retorna direto do banco local** em ~20ms (zero chamadas externas, zero tempo de espera, zero custo de requisição externa).
* Se `agora - productFromDb.updatedAt >= 30 minutos`:
  * Consulta a API do Mercado Livre.
  * Se o preço ou estoque mudou, atualiza com `prisma.product.update` (o Prisma atualiza automaticamente o `updatedAt`).
  * Se o preço e estoque continuam iguais, faz um `touch` rápido ou atualiza o `updatedAt` para reiniciar a janela de 30 minutos.
* Suporte a parâmetro de bypass: `?forceRefresh=true` para quando o administrador quiser forçar a atualização imediata no painel.

---

## 3. Roteiro de Implementação Passo a Passo

### Passo 1: Modificar `src/app/api/products/[id]/route.ts`

Localizar no método `GET` o bloco de produtos do Mercado Livre:

```typescript
// Configuração do intervalo de cache (em milissegundos)
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutos

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const forceRefresh = req.nextUrl.searchParams.get("forceRefresh") === "true";

    // 1. Busca produto no banco
    const productFromDb = await prisma.product.findUnique({
      where: { id: id },
      include: {
        category: true,
        brand: true,
        pictures: true,
      },
    });

    if (!productFromDb) {
      return NextResponse.json(
        { success: false, error: "Produto não encontrado no banco de dados." },
        { status: 404 }
      );
    }

    // 2. Produto LOCAL nunca consulta o Mercado Livre
    if (productFromDb.origin === "LOCAL") {
      return NextResponse.json({
        success: true,
        data: {
          ...productFromDb,
          attributes: [],
        },
      });
    }

    // 3. Verifica se o cache ainda é válido
    const lastUpdate = new Date(productFromDb.updatedAt).getTime();
    const isCacheValid = Date.now() - lastUpdate < CACHE_TTL_MS;

    // Se o cache for válido e não for requisição forçada, retorna direto do banco
    if (isCacheValid && !forceRefresh) {
      return NextResponse.json({
        success: true,
        data: {
          ...productFromDb,
          attributes: [],
        },
      });
    }

    // 4. Se expirou os 30 min (ou forceRefresh), busca dados frescos na API do ML
    let mlData: MercadoLibreProductDetails | null = null;
    try {
      mlData = await fetchProductDetailsFromMercadoLibre(id);
    } catch (mlError) {
      console.warn(
        `[products/${id}] Não foi possível buscar dados do ML — usando banco como fallback.`,
        mlError instanceof Error ? mlError.message : mlError
      );
    }

    let finalPrice = productFromDb.price;
    let finalQuantity = productFromDb.available_quantity;

    if (mlData) {
      const freshPrice =
        typeof mlData.price === "number" ? mlData.price : productFromDb.price;
      const isMlActive = !mlData.status || mlData.status === "active";
      const freshQuantity = isMlActive
        ? (typeof mlData.available_quantity === "number"
            ? mlData.available_quantity
            : productFromDb.available_quantity)
        : 0;

      // Se mudou ou expirou o cache, atualiza o banco para renovar o updatedAt
      try {
        await prisma.product.update({
          where: { id: id },
          data: {
            price: freshPrice,
            available_quantity: freshQuantity,
            updatedAt: new Date(),
          },
        });
        finalPrice = freshPrice;
        finalQuantity = freshQuantity;
      } catch (dbUpdateError) {
        console.error(
          `[products/${id}] Erro ao persistir preço/estoque atualizados do ML no banco:`,
          dbUpdateError
        );
        finalPrice = freshPrice;
        finalQuantity = freshQuantity;
      }
    }

    const combinedProduct = mlData
      ? {
          ...productFromDb,
          price: finalPrice,
          available_quantity: finalQuantity,
          attributes: mlData.attributes ?? [],
          pictures:
            mlData.pictures?.length ? mlData.pictures : productFromDb.pictures,
          permalink: productFromDb.permalink || mlData.permalink,
          seller_nickname:
            mlData.seller?.nickname || productFromDb.seller_nickname,
        }
      : {
          ...productFromDb,
          attributes: [],
        };

    return NextResponse.json({ success: true, data: combinedProduct });
  } catch (error) {
    // ... tratamento de erro
  }
}
```

---

## 4. Opcional: Agendamento Automático via Vercel Cron (Plano B complementar)

Se desejar que o catálogo inteiro seja sincronizado 1 ou 2 vezes ao dia sem esperar cliques de usuários:

1. No arquivo `vercel.json` na raiz do projeto:
```json
{
  "crons": [
    {
      "path": "/api/cron/sync-ml",
      "schedule": "0 8,14 * * *"
    }
  ]
}
```
2. Criar a rota `src/app/api/cron/sync-ml/route.ts` protegida pelo header `Authorization: Bearer ${process.env.CRON_SECRET}` para chamar `syncMercadoLivreProducts()`.

---

## 5. Benefícios Esperados

1. **Redução de 90% a 95%** nas chamadas à API externa do Mercado Livre.
2. **Tempo de carregamento das páginas:** reduz de ~1s para menos de 50ms na maior parte dos acessos.
3. **Custo Zero:** permanece com grande folga dentro do plano gratuito da Vercel (Hobby) e do Prisma IO.
4. **Produtos Locais continuam 100% protegidos**, sem qualquer risco de alteração externa.
