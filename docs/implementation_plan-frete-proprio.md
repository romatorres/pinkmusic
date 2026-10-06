# Sistema de Frete Próprio — Pink Music Instrumentos

**Implementado:** Outubro/2026
**Status:** ✅ Em produção
**Substitui:** Uber Direct (descontinuado)

---

## Visão Geral

Sistema de cálculo de frete para entregas locais em **Feira de Santana - BA**, sem dependência de plataformas externas de entrega para calcular o preço no checkout. Os preços são definidos por regras fixas armazenadas no banco de dados e podem ser ajustados pelo painel administrativo sem alteração de código.

---

## Origem das Entregas

| Campo | Valor |
|---|---|
| CEP de origem | `44002-000` |
| Endereço | Rua JJ Seabra 31, Centro |
| Cidade / UF | Feira de Santana - BA |
| Latitude | `-12.2576` (configurável via `STORE_LAT`) |
| Longitude | `-38.9634` (configurável via `STORE_LNG`) |
| Raio máximo | 10 km (3 zonas) |

---

## Banco de Dados

### Novos modelos (migração `20261006000236_add_shipping_zones_and_zipcodes`)

#### `ShippingZone`
Zonas de entrega com faixa de distância e preço fixo.

```prisma
model ShippingZone {
  id          String            @id @default(cuid())
  name        String
  description String?
  minDistance Float             // km (inclusive)
  maxDistance Float             // km (exclusivo)
  price       Decimal           @db.Decimal(10, 2)
  active      Boolean           @default(true)
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt
  zipCodes    ShippingZipCode[]
}
```

#### `ShippingZipCode`
CEPs mapeados manualmente ou importados via CSV, com coordenadas para cálculo de distância.

```prisma
model ShippingZipCode {
  id        String        @id @default(cuid())
  zipCode   String        @unique  // 8 dígitos sem hífen
  district  String?
  city      String
  state     String
  latitude  Float?
  longitude Float?
  zoneId    String?
  zone      ShippingZone? @relation(...)
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt
}
```

#### Campos adicionados ao modelo `Order`
```prisma
shippingPrice    Decimal?  // snapshot do preço cobrado
shippingCep      String?   // CEP informado pelo cliente
shippingZone     String?   // nome da zona (ex: "Zona 2")
shippingDistance Float?    // distância calculada em km
shippingMethod   String?   // "OSRM_ROUTE" | "HAVERSINE_FALLBACK"
```

> [!IMPORTANT]
> Os campos legados `uberDeliveryId`, `uberTrackingUrl`, `uberDispatchedAt` foram mantidos no schema para não quebrar pedidos históricos, mas não são mais populados em novos pedidos.

---

## Zonas Padrão (Seed Automático)

Criadas automaticamente na primeira execução se a tabela estiver vazia:

| Zona | Faixa de Distância | Preço |
|---|---|---|
| Zona 1 | 0 – 3 km | R$ 8,90 |
| Zona 2 | 3 – 6 km | R$ 11,90 |
| Zona 3 | 6 – 10 km | R$ 15,90 |

> [!TIP]
> Os preços podem ser ajustados a qualquer momento pelo painel em `/dashboard/settings/shipping` sem necessidade de deploy.

---

## Arquitetura do Sistema

### Arquivos criados em `src/lib/shipping/`

| Arquivo | Responsabilidade |
|---|---|
| `config.ts` | CEP/coordenadas de origem e parâmetros globais |
| `normalize-zipcode.ts` | Normalização e validação de CEP brasileiro (8 dígitos) |
| `calculate-distance.ts` | Cálculo de distância (OSRM + fallback Haversine×1.35) |
| `calculate-shipping.ts` | Lógica principal: CEP → zona → preço |
| `seed.ts` | Criação automática das zonas padrão se tabela vazia |

---

## Cálculo de Distância

### Método primário: OSRM (distância real por estrada)

Utiliza o servidor público gratuito `router.project-osrm.org` (OpenStreetMap), sem chave de API. Retorna a **distância real percorrida pelas ruas**, que é a base usada pelos motoboys parceiros para cobrar as corridas.

```
GET https://router.project-osrm.org/route/v1/driving/{lng_origem},{lat_origem};{lng_destino},{lat_destino}?overview=false
```

- **Timeout:** 4 segundos
- **Cache:** `no-store` (sem cache no edge)

### Fallback automático: Haversine × 1,35

Se o OSRM não responder dentro de 4 segundos, o sistema calcula a distância em linha reta (fórmula de Haversine) e aplica um fator de correção de **1,35** para aproximar da distância real viária, evitando travar o checkout.

### Configuração de servidor OSRM próprio (opcional)

```env
# .env.local ou variável na Vercel:
OSRM_URL=https://seu-servidor-osrm.railway.app
```

Se não configurado, usa `https://router.project-osrm.org` por padrão.

---

## Fluxo de Cálculo no Checkout

```
Cliente informa o CEP
        ↓
POST /api/shipping/calculate
        ↓
1. Normaliza CEP (8 dígitos)
        ↓
2. Busca CEP na tabela ShippingZipCode (DB local)
        ↓ não encontrado
3. Consulta ViaCEP → verifica se é Feira de Santana - BA
        ↓ outra cidade
   Retorna: OUT_OF_DELIVERY_AREA
        ↓ é Feira de Santana
4. Obtém coordenadas (DB ou bairro vizinho)
        ↓
5. calculateDistance() → OSRM (fallback: Haversine×1.35)
        ↓
6. Busca ShippingZone ativa com minDistance ≤ dist < maxDistance
        ↓ nenhuma zona cobre
   Retorna: OUT_OF_DELIVERY_AREA
        ↓
7. Retorna: zona, distância, preço
```

### Validação no servidor (segurança)

Quando o cliente clica em "Gerar PIX", o backend em `POST /api/orders` **recalcula o frete** com o CEP informado — nunca confia no valor enviado pelo frontend. O preço é tirado diretamente do banco (`ShippingZone.price`).

---

## APIs

### Pública

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/shipping/calculate` | Calcula frete para um CEP |

**Request:**
```json
{ "zipCode": "44050-000" }
```

**Response (sucesso):**
```json
{
  "available": true,
  "zipCode": "44050000",
  "formattedZipCode": "44050-000",
  "district": "Cidade Nova",
  "city": "Feira de Santana",
  "state": "BA",
  "zone": { "id": "...", "name": "Zona 2", "description": "3 a 6 km" },
  "distanceKm": 4.2,
  "price": 11.90
}
```

**Response (fora da área):**
```json
{
  "available": false,
  "reason": "OUT_OF_DELIVERY_AREA",
  "message": "Entregas locais disponíveis apenas para Feira de Santana - BA."
}
```

### Admin (autenticado)

| Método | Rota | Descrição |
|---|---|---|
| GET / POST | `/api/admin/shipping/zones` | Listar / criar zonas |
| PUT / DELETE | `/api/admin/shipping/zones/[id]` | Editar / excluir zona |
| GET / POST | `/api/admin/shipping/zipcodes` | Listar / adicionar CEPs |
| DELETE | `/api/admin/shipping/zipcodes/[id]` | Remover CEP |

O POST em `/api/admin/shipping/zipcodes` aceita tanto um único CEP quanto um CSV com colunas `zipCode,district,city,state,latitude,longitude`.

---

## Painel Administrativo

**Rota:** `/dashboard/settings/shipping`
**Link no sidebar:** "Entregas & Frete" (ícone Truck)

Funcionalidades:
- Listar zonas com status ativo/inativo (clique para alternar)
- Criar / editar / excluir zonas
- Listar CEPs mapeados com busca e filtro por zona
- Adicionar CEP individual
- Importar CEPs em massa via CSV

---

## Variáveis de Ambiente

```env
# Coordenadas da loja (opcional — defaults já configurados)
STORE_LAT=-12.2576
STORE_LNG=-38.9634
STORE_CITY="Feira de Santana"
STORE_STATE=BA
STORE_ZIP=44002000

# Servidor OSRM próprio (opcional — usa servidor público por padrão)
OSRM_URL=https://router.project-osrm.org
```

---

## Como Adicionar Mais CEPs

### Opção 1 — Pelo painel admin
1. Acesse `/dashboard/settings/shipping` → aba "CEPs & Regiões"
2. Clique em "+ Adicionar CEP"
3. Informe o CEP e os dados do bairro

### Opção 2 — Via CSV
Formato do arquivo:
```csv
zipCode,district,city,state,latitude,longitude
44085000,SIM,Feira de Santana,BA,-12.2289,-38.9341
44100000,Mangabeira,Feira de Santana,BA,-12.2712,-38.9891
```

Upload pelo painel: aba "CEPs & Regiões" → botão "Importar CSV"

### Opção 3 — CEP não cadastrado
Se um CEP não está no banco, o sistema consulta o ViaCEP automaticamente:
- Se for de Feira de Santana → tenta herdar coordenadas de CEP do mesmo bairro
- Se não houver coordenadas disponíveis → retorna erro de área não coberta

---

## Relatório de Motivos da Descontinuação do Uber Direct

Documentado em [`relatorio-investigacao-uber-direct.md`](./relatorio-investigacao-uber-direct.md).

**Resumo:**
- Raio máximo de 5 km pela conta corporativa (sem possibilidade de ajuste pelo suporte)
- Valores de R$ 14,30 a R$ 21,90 para corridas curtas de até 4 km
- Suporte técnico insatisfatório para ajuste de tabela
- Dependência de plataforma B2B sem SLA garantido para pequenas empresas
