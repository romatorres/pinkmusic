# Sistema de Frete Próprio Local — Pink Music Instrumentos

**Última Atualização:** Outubro/2026 (Revisão Completa — 15/10/2026)  
**Status:** ✅ Em produção (Blindado e calibrado para Feira de Santana - BA)  
**Substitui:** Uber Direct (descontinuado) e OSRM público (descontinuado por instabilidade)

---

## 1. Visão Geral

O sistema calcula o frete de entregas locais para clientes em **Feira de Santana - BA** de forma rápida, autônoma e sem dependência de plataformas pagas ou servidores externos instáveis.

Os valores de frete são baseados em **4 Zonas de Distância** configuradas no banco de dados e gerenciáveis diretamente pelo painel administrativo, com recálculo seguro no backend tanto no checkout quanto no momento da geração do PIX.

### Princípio Central
> **Dúvida NUNCA bloqueia a venda em silêncio.**  
> Só bloqueia quando há CERTEZA (bairro rural confirmado ou município fora de Feira de Santana).  
> Bairros ambíguos ou não encontrados → `NEEDS_NEIGHBORHOOD` (o cliente confirma/seleciona o bairro na interface).

---

## 2. Parâmetros de Origem da Loja Física

Configurados em [`src/lib/shipping/config.ts`](file:///c:/Web/pinkmusic/src/lib/shipping/config.ts):

| Parâmetro | Valor Configurado | Variável de Ambiente / Config |
|---|---|---|
| **CEP de Origem** | `44002-000` | `STORE_ZIP` (fallback: `44002000`) |
| **Endereço** | Rua JJ Seabra / Centro | `STORE_CITY`, `STORE_STATE` |
| **Cidade / UF** | Feira de Santana - BA | `STORE_CITY="Feira de Santana"`, `STORE_STATE="BA"` |
| **Latitude** | `-12.2576` | `STORE_LAT` |
| **Longitude** | `-38.9634` | `STORE_LNG` |
| **Raio Máximo** | `12.0 km` (limite da Zona 4) | `maxDeliveryRadiusKm` em `config.ts` |
| **Faixa de CEP Feira** | `44000000` até `44199999` | `zipRangeMin` / `zipRangeMax` em `config.ts` |
| **Gap máx. interpolação** | `60` (numérico entre CEPs vizinhos) | `neighborInterpolationMaxGap` em `config.ts` |

---

## 3. Zonas de Entrega Ativas

Cadastradas no banco de dados (tabela `ShippingZone`) e geradas via `npm run seed:shipping`:

| Zona | Ordem (`order`) | Faixa de Raio Estimado | Preço Padrão | Regiões Atendidas Típicas |
|:---:|:---:|:---:|:---:|:---|
| **Zona 1** | 1 | 0 até 3 km | R$ 10,00 | Centro, Chácara São Cosme, Serraria Brasil, Baraúnas, Olhos D'Água, Pedra do Descanso, Rua Nova, Ponto Central, Jardim Acácia, Lagoa Grande, Cruzeiro, Queimadinha, Muchila, Capuchinhos, Calumbi |
| **Zona 2** | 2 | 3 até 6 km | R$ 12,00 | Sobradinho, São João, Caseb, Jardim Cruzeiro, Parque Getúlio Vargas, Nova Esperança, Chaparral, Tomba, Santa Mônica, Brasília, Cidade Nova, Gabriela, Lagoa Salgada, Parque Ipê, 35º BI, Subaé (urbano), SIM, Campo Limpo |
| **Zona 3** | 3 | 6 até 10 km | R$ 15,00 | Conceição, Fraternidade, Pampalona, Mangabeira, Campo do Gado Novo, Vale do Jacuípe, Asa Branca, Santo Antônio dos Prazeres, Aviário, Novo Horizonte, Papagaio, CIS |
| **Zona 4** | 4 | 10 até 12 km | R$ 18,00 | CIS Norte, Registro, Aeroporto |

> [!NOTE]
> O campo `order` (inteiro 1–4) é o identificador lógico da zona. Não utilize o `id` (cuid) como indicador de ordenação.

---

## 4. Arquitetura de Arquivos (`src/lib/shipping/`)

| Arquivo | Responsabilidade |
|---|---|
| [`config.ts`](file:///c:/Web/pinkmusic/src/lib/shipping/config.ts) | Parâmetros da loja, faixa de CEPs válidos, coordenadas e limites de tolerância. |
| [`normalize-zipcode.ts`](file:///c:/Web/pinkmusic/src/lib/shipping/normalize-zipcode.ts) | Sanitização do CEP (remoção de formatação, validação de 8 dígitos numéricos). |
| [`data/feira-ceps.json`](file:///c:/Web/pinkmusic/src/lib/shipping/data/feira-ceps.json) | Base local offline com mais de 2.800 CEPs/logradouros e bairros mapeados de Feira de Santana (0ms). |
| [`zone-lookup.ts`](file:///c:/Web/pinkmusic/src/lib/shipping/zone-lookup.ts) | Cascata determinística de resolução em 8 passos e geração dinâmica de mapas de prefixo. |
| [`calculate-shipping.ts`](file:///c:/Web/pinkmusic/src/lib/shipping/calculate-shipping.ts) | Orquestração do cálculo, validação de seleção manual do cliente, regra anti-fraude, `needsReview` e cache. |
| [`seed.ts`](file:///c:/Web/pinkmusic/src/lib/shipping/seed.ts) | Inicialização e garantia das 4 zonas e bairros via comando dedicado (`npm run seed:shipping`). |

---

## 5. Cascata de Resolução de Zonas (8 Passos)

Implementada na função `resolveZone(cleanZip)` em [`zone-lookup.ts`](file:///c:/Web/pinkmusic/src/lib/shipping/zone-lookup.ts):

```text
[ Cliente digita CEP: "44059-370" ]
                  │
                  ▼
[ PASSO 0: Validação de Faixa de CEP ]
Verifica se está entre 44000000 e 44199999.
Se fora: OUT_OF_DELIVERY_AREA (OUTSIDE_FEIRA_RANGE)
                  │
                  ▼
[ PASSO 1: Override Manual no Banco (ShippingZipOverride) ]
Consulta se o CEP específico tem regra cadastrada manualmente.
Se tiver: Retorna imediatamente a zona do override (confidence: high)
                  │
                  ▼
[ BLOQUEIO: Prefixo Rural Puro (OUT_OF_AREA_PREFIXES) ]
Prefixo de 5 dígitos onde 100% das ocorrências no JSON são rurais.
Exemplos: 44099 (Humildes), 44039 (Mantiba), 44037/44038 (Pedra Ferrada), 44097/44098 (Limoeiro).
Se bater: Bloqueio imediato OUT_OF_DELIVERY_AREA (RURAL_PREFIX_BLOCKED)
                  │
                  ▼
[ PASSO 2: Cache do Banco com Alta Confiança (ShippingZipCode) ]
Consulta tabela ShippingZipCode. Se confidence === "high" e zona ativa:
Retorna zona em < 1ms (source: db_cache_high)
                  │
                  ▼
[ PASSO 3: Base Local Offline JSON (feira-ceps.json) ]
Busca nos ~2.800 CEPs locais.
- Se distrito rural confirmado (Set RURAL_DISTRICT_EXACT_KEYS): Bloqueia.
- Se bairro urbano mapeado: Retorna Zona 1 a 4 (confidence: high).
                  │
                  ▼
[ PASSO 4: APIs Externas em Paralelo (Promise.any) ]
Dispara ViaCEP (timeout 3.5s) + BrasilAPI (timeout 2.5s) simultaneamente.
- Cidade diferente de Feira de Santana: Bloqueia (OUTSIDE_MUNICIPALITY).
- Bairro rural confirmado: Bloqueia (RURAL_DISTRICT_API).
- Bairro identificado e mapeado: Retorna zona (confidence: high).
                  │
                  ▼
[ PASSO 5: Interpolação no Array de CEPs Ordenados ]
Busca binária no array ordenado de CEPs:
- Encontra o CEP anterior e o posterior mais próximos.
- Valida se ambos têm o mesmo prefixo de 5 dígitos, o mesmo bairro e gap numérico <= 60.
- Se válido e não rural: Retorna zona (confidence: medium, source: neighbor_interp).
                  │
                  ▼
[ PASSO 6: Prefixo Puro de 5 Dígitos ]
Consulta ZIP_PREFIX_ZONE_MAP (gerado dinamicamente na carga se 100% dos CEPs do prefixo têm a mesma zona).
Se encontrado: Retorna zona (confidence: medium, source: zip_prefix).
                  │
                  ▼
[ PASSO 7: Fallback Seguro — NEEDS_NEIGHBORHOOD ]
O CEP pertence à faixa de Feira de Santana, mas nenhuma regra automática identificou o bairro com certeza.
- Registra em ShippingUnresolvedZip (incrementa hitCount).
- Retorna available: false, reason: "NEEDS_NEIGHBORHOOD" + lista de bairros urbanos atendidos.
- A UI abre seleção para o cliente escolher o bairro ou acionar o WhatsApp.
```

---

## 6. Fluxo de Seleção Manual e Regra Anti-Fraude (`needsReview`)

Quando a consulta retorna `NEEDS_NEIGHBORHOOD`, o modal de checkout (`PixCheckoutModal.tsx`) permite que o cliente selecione seu bairro a partir da lista oficial de bairros atendidos.

### Regras de Negócio:
1. **Prioridade da Certeza:** Se o lookup interno resolver o CEP com `confidence: "high"`, a seleção manual do cliente é ignorada para evitar manipulação indevida de taxas.
2. **Proteção Anti-Fraude de Valor:** Se o lookup tiver uma estimativa (`confidence: "medium"` ou `"low"`) que aponte para uma zona **maior** do que o bairro escolhido pelo cliente, o sistema aplica automaticamente a zona de maior valor.
3. **Sinalização para o Lojista:** Qualquer pedido originado com seleção manual de bairro recebe a flag `needsReview: true` gravada no pedido (`Order.needsReview`), permitindo ao lojista conferir no painel administrativo antes de despachar.
4. **Isolamento de Cache:** Escolhas manuais do cliente **nunca** são salvas no cache oficial `ShippingZipCode`. Elas são registradas em `ShippingUnresolvedZip` com motivo `CUSTOMER_SELECTED_NEIGHBORHOOD` para monitoramento.

---

## 7. Modelos no Banco de Dados (Prisma)

### `ShippingZone`
Define as faixas e valores de entrega:
```prisma
model ShippingZone {
  id          String            @id @default(cuid())
  name        String
  description String?
  order       Int               // 1=Z1, 2=Z2, 3=Z3, 4=Z4
  minDistance Float             // km (inclusivo)
  maxDistance Float             // km (exclusivo)
  price       Decimal           @db.Decimal(10, 2)
  active      Boolean           @default(true)
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt
  zipCodes    ShippingZipCode[]
}
```

### `ShippingZipCode` (Cache de Alta Confiança)
```prisma
model ShippingZipCode {
  id         String        @id @default(cuid())
  zipCode    String        @unique  // 8 dígitos numéricos
  district   String?
  city       String
  state      String
  latitude   Float?
  longitude  Float?
  zoneId     String?
  zone       ShippingZone? @relation(fields: [zoneId], references: [id])
  source     String?       // "local_json" | "viacep" | "brasilapi"
  confidence String?       // "high" | "medium" | "low"
  createdAt  DateTime      @default(now())
  updatedAt  DateTime      @updatedAt
}
```

### `ShippingNeighborhood` (Mapeamento de Bairros no Banco)
```prisma
model ShippingNeighborhood {
  id            String   @id @default(cuid())
  name          String
  normalizedKey String   @unique  // ex: "papagaio"
  aliases       String[] // ex: ["papagaio", "conjuntopapagaio"]
  zoneOrder     Int?     // 1, 2, 3 ou 4 (null se outOfArea)
  outOfArea     Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

### `ShippingZipOverride` (Override Manual por CEP)
```prisma
model ShippingZipOverride {
  id        String   @id @default(cuid())
  zipCode   String   @unique
  district  String
  zoneOrder Int?     // null = bloqueia este CEP
  reason    String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### `ShippingUnresolvedZip` (Auditoria e Cobertura)
```prisma
model ShippingUnresolvedZip {
  id        String   @id @default(cuid())
  zipCode   String   @unique
  district  String?
  city      String?
  state     String?
  reason    String?  // "NO_NEIGHBORHOOD_MATCH" | "CUSTOMER_SELECTED_NEIGHBORHOOD"
  hitCount  Int      @default(1)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

## 8. Endpoints de API

### Pública: `POST /api/shipping/calculate`
Calcula o frete local com rate-limit ativo.

**Exemplo de Requisição Simples:**
```json
{
  "zipCode": "44052-460"
}
```

**Exemplo com Bairro Selecionado:**
```json
{
  "zipCode": "44059-000",
  "selectedNeighborhoodKey": "papagaio"
}
```

**Retorno de Sucesso (200):**
```json
{
  "available": true,
  "zipCode": "44052460",
  "formattedZipCode": "44052-460",
  "district": "Lagoa Grande",
  "city": "Feira de Santana",
  "state": "BA",
  "zone": {
    "id": "cmuvyggmj0001q94s111byt6x",
    "name": "Zona 1",
    "description": "Até 3 km — Centro e bairros adjacentes"
  },
  "distanceKm": 1.5,
  "price": 10.00,
  "needsReview": false
}
```

**Retorno Quando Requer Bairro (`NEEDS_NEIGHBORHOOD`):**
```json
{
  "available": false,
  "reason": "NEEDS_NEIGHBORHOOD",
  "message": "Não conseguimos identificar o bairro pelo CEP informado. Por favor, selecione seu bairro na lista ou fale conosco pelo WhatsApp.",
  "zipCode": "44059000",
  "neighborhoods": [
    { "key": "centro", "name": "Centro" },
    { "key": "papagaio", "name": "Papagaio" },
    { "key": "sim", "name": "SIM" }
  ]
}
```

---

## 9. Como Ajustar Zonas e Regras

1. **Alterar Zona de um Bairro no Código:**  
   Abra [`zone-lookup.ts`](file:///c:/Web/pinkmusic/src/lib/shipping/zone-lookup.ts) e ajuste o valor no objeto `NEIGHBORHOOD_ZONE_MAP`:
   ```typescript
   campolimpo: 2, // 1, 2, 3 ou 4
   ```
2. **Alterar Zona de um Bairro via Banco:**  
   Atualize o registro correspondente na tabela `ShippingNeighborhood`. A leitura no banco tem precedência sobre o fallback estático.
3. **Fixar Exceção para um CEP Específico:**  
   Insira um registro na tabela `ShippingZipOverride`. Ele tem prioridade máxima (Passo 1 da cascata).
4. **Verificar CEPs que Precisam de Mapeamento:**  
   Consulte a tabela `ShippingUnresolvedZip` ordenada por `hitCount DESC`.

---

## 10. Comparativo: Antes vs. Depois (Evolução de 15/10/2026)

| Característica | Arquitetura Antiga | Arquitetura Atual (15/10) |
|---|---|---|
| **Estratégia de Resolução** | Cálculo GPS Haversine instável | Resolução determinística por Bairro + Prefixo |
| **APIs Externas** | 4 APIs em série lenta | ViaCEP + BrasilAPI em paralelo via `Promise.any` |
| **Dúvidas de Bairro** | Jogava silenciosamente para Zona 3 | `NEEDS_NEIGHBORHOOD` com seleção pelo cliente |
| **Proteção Anti-Fraude** | Inexistente | Prevalece zona maior + flag `needsReview` no pedido |
| **Bloqueio Rural** | Apenas no fim do cálculo | Bloqueio imediato por prefixo 100% rural |
| **Tempo de Resposta (Cache)** | ~500ms | **< 1ms** |
| **Execução de Seed** | No caminho crítico de cada requisição | Comando isolado `npm run seed:shipping` |
