# Sistema de Frete Próprio Local — Pink Music Instrumentos

**Última Atualização:** Outubro/2026  
**Status:** ✅ Em produção (Blindado e calibrado para Feira de Santana - BA)  
**Substitui:** Uber Direct (descontinuado) e OSRM público (descontinuado por instabilidade)

---

## 1. Visão Geral

O sistema calcula o frete de entregas locais para clientes em **Feira de Santana - BA** de forma rápida, autônoma e sem dependência de plataformas pagas ou servidores externos instáveis.

Os valores de frete são baseados em **3 Zonas de Distância** configuradas no banco de dados e gerenciáveis diretamente pelo painel administrativo, com recálculo seguro no checkout e no momento de geração do PIX.

---

## 2. Parâmetros de Origem da Loja Física

| Parâmetro | Valor Configurado | Variável de Ambiente |
|---|---|---|
| **CEP de Origem** | `44002-000` | `STORE_ZIP` (fallback: `44002000`) |
| **Endereço** | Rua JJ Seabra / Kalilândia / Centro | `STORE_CITY`, `STORE_STATE` |
| **Cidade / UF** | Feira de Santana - BA | `STORE_CITY="Feira de Santana"`, `STORE_STATE="BA"` |
| **Latitude** | `-12.2576` | `STORE_LAT` |
| **Longitude** | `-38.9634` | `STORE_LNG` |
| **Raio Máximo** | `10.0 km` (limite da Zona 3) | `maxDeliveryRadiusKm` em `config.ts` |

---

## 3. Zonas de Entrega Ativas

Cadastradas no banco de dados (tabela `ShippingZone`) e criadas automaticamente via `seed.ts` se a tabela estiver vazia:

| Zona | Faixa de Distância Viária | Preço Padrão | Regiões Atendidas Típicas |
|:---:|:---:|:---:|:---|
| **Zona 1** | $0 \text{ até } 3.0 \text{ km}$ | R$ 8,90 | Centro, Kalilândia, Sobradinho, Brasília, Serraria Brasil, Queimadinha, Ponto Central |
| **Zona 2** | $> 3.0 \text{ até } 6.0 \text{ km}$ | R$ 11,90 | Lagoa Grande, Caseb, São João, Santa Mônica, Capuchinhos, Cidade Nova, Tomba, Parque Ipê |
| **Zona 3** | $> 6.0 \text{ até } 10.0 \text{ km}$ | R$ 15,90 | SIM (Artêmia Pires), Mangabeira, Papagaio, Conceição, Feira X, Feira VII, Feira IX |

> [!NOTE]
> A verificação de enquadramento da última zona utiliza a condição inclusiva $\le 10.0 \text{ km}$, garantindo que clientes no raio exato de 10 km não sejam rejeitados.

---

## 4. Arquitetura de Arquivos (`src/lib/shipping/`)

| Arquivo | Responsabilidade |
|---|---|
| [`config.ts`](file:///c:/Web-Pc/pinkmusic/src/lib/shipping/config.ts) | Parâmetros da loja física, coordenadas de partida, variáveis de ambiente e raio máximo. |
| [`normalize-zipcode.ts`](file:///c:/Web-Pc/pinkmusic/src/lib/shipping/normalize-zipcode.ts) | Sanitização do CEP (remoção de pontuação, validação estrita de 8 dígitos numéricos). |
| [`geocode-zip.ts`](file:///c:/Web-Pc/pinkmusic/src/lib/shipping/geocode-zip.ts) | Mecanismo de geocodificação em camadas com Bounding Box urbana, ViaCEP e centróides urbanos oficiais. |
| [`calculate-distance.ts`](file:///c:/Web-Pc/pinkmusic/src/lib/shipping/calculate-distance.ts) | Cálculo de distância utilizando a fórmula de Haversine corrigida pelo fator viário empírico ($\times 1.4$). |
| [`calculate-shipping.ts`](file:///c:/Web-Pc/pinkmusic/src/lib/shipping/calculate-shipping.ts) | Lógica central: validação de cidade, sanitização do banco, cálculo de zona e persistência de dados. |
| [`seed.ts`](file:///c:/Web-Pc/pinkmusic/src/lib/shipping/seed.ts) | Inicialização automática das 3 zonas de entrega e CEPs de referência. |

---

## 5. Estratégia de Geocodificação em Camadas (`geocode-zip.ts`)

Para evitar falhas de APIs públicas e homônimos rurais de Feira de Santana (como povoados em Ipuaçu ou Humildes que causavam distâncias erradas de mais de 20 km), o sistema opera em **6 camadas resilientes**:

```
                       Cliente informa o CEP (ex: 44052-460)
                                        │
                                        ▼
             ┌─────────────────────────────────────────────────────┐
  Camada 1   │ 1. AwesomeAPI (busca coordenadas por CEP direto)   │ ── Válido e Urbano? ──► Retorna lat/lng
             └─────────────────────────────────────────────────────┘             │ (Não/Timeout)
                                        │                                        ▼
             ┌─────────────────────────────────────────────────────┐
  Camada 2   │ 2. ViaCEP (busca Logradouro + Bairro oficiais)     │ ──► Obtém Rua e Bairro
             └─────────────────────────────────────────────────────┘
                                        │
                                        ▼
             ┌─────────────────────────────────────────────────────┐
  Camada 3   │ 3. Nominatim com Bounding Box Urbana Restrita      │ ── Encontrou na Box? ──► Retorna lat/lng
             │    (viewbox=-39.06,-12.35,-38.83,-12.15&bounded=1)  │             │ (Não)
             └─────────────────────────────────────────────────────┘             ▼
                                        │
                                        ▼
             ┌─────────────────────────────────────────────────────┐
  Camada 4   │ 4. Catálogo de Centróides Urbanos de Feira (50+)    │ ── Bairro Mapeado? ──► Retorna lat/lng
             │    (Lagoa Grande, Sobradinho, SIM, Tomba, etc.)    │             │ (Não)
             └─────────────────────────────────────────────────────┘             ▼
                                        │
                                        ▼
             ┌─────────────────────────────────────────────────────┐
  Camada 5   │ 5. Herança de CEP vizinho do mesmo bairro no banco  │ ── Tem registro? ────► Retorna lat/lng
             └─────────────────────────────────────────────────────┘             │ (Não)
                                        │                                        ▼
             ┌─────────────────────────────────────────────────────┐
  Camada 6   │ 6. Fallback cadastral urbano central               │
             └─────────────────────────────────────────────────────┘
```

### Detalhes de Blindagem Implementados:

1. **Bounding Box Urbana no Nominatim:**
   - As consultas ao OpenStreetMap são restritas à área urbana de Feira de Santana (`minLng: -39.06`, `minLat: -12.35`, `maxLng: -38.83`, `maxLat: -12.15` com `bounded=1`).
   - Isso bloqueia 100% de falsos positivos com povoados homônimos na zona rural (ex: vilarejo Lagoa Grande em Ipuaçu).
2. **Prioridade de Busca com Logradouro:**
   - A busca tenta primeiro `"Rua Belmiro, Feira de Santana, BA"` antes de tentar apenas o bairro, localizando a via exata.
3. **Catálogo Local de Centróides Urbanos (`FEIRA_URBAN_NEIGHBORHOODS`):**
   - Contém as coordenadas centrais pré-computadas de mais de 50 bairros de Feira de Santana.
   - Atua como garantia imediata caso as APIs externas estejam lentas ou fora do ar.
4. **Proteção de Recálculo em `calculate-shipping.ts`:**
   - Se a distância resultante for superior ao raio máximo ($> 10 \text{ km}$) mas o bairro for sabidamente urbano, o sistema **intercepta e recalcula via centróide urbano**, impedindo a rejeição injusta da entrega.
   - Registros do banco com coordenadas históricas que geravam distâncias $> 14 \text{ km}$ em Feira de Santana são invalidados e corrigidos automaticamente.

---

## 6. Cálculo de Distância (`calculate-distance.ts`)

A distância viária estimada é obtida pela fórmula de **Haversine** multiplicada pelo fator viário urbano empírico:

$$\text{Distância Estimada (km)} = \text{Distância em Linha Reta} \times 1.4$$

- **Por que não OSRM público?** O serviço público `router.project-osrm.org` foi descontinuado do fluxo por instabilidade frequente e retorno de distâncias anômalas (ex: 12.000 km) em produção.
- **Precisão:** Para raios municipais de até 10 km, o erro do modelo Haversine $\times 1.4$ é inferior a 10%, correspondendo perfeitamente às faixas de preço cobradas por motoboys parceiros.

---

## 7. Modelos no Banco de Dados (Prisma)

### `ShippingZone`
```prisma
model ShippingZone {
  id          String            @id @default(cuid())
  name        String
  description String?
  minDistance Float             // km (inclusivo)
  maxDistance Float             // km (exclusivo, exceto na última zona)
  price       Decimal           @db.Decimal(10, 2)
  active      Boolean           @default(true)
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt
  zipCodes    ShippingZipCode[]
}
```

### `ShippingZipCode`
```prisma
model ShippingZipCode {
  id        String        @id @default(cuid())
  zipCode   String        @unique  // 8 dígitos numéricos
  district  String?
  city      String
  state     String
  latitude  Float?
  longitude Float?
  zoneId    String?
  zone      ShippingZone? @relation(fields: [zoneId], references: [id])
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt
}
```

---

## 8. Endpoints de API

### Pública: `POST /api/shipping/calculate`
Calcula o frete a partir do CEP informado, com proteção por rate-limit (30 req/min).

- **Payload:** `{ "zipCode": "44052-460" }`
- **Retorno Sucesso (200):**
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
    "name": "Zona 2",
    "description": "Acima de 3 até 6 km (Região intermediária de Feira)"
  },
  "distanceKm": 3.45,
  "price": 11.90
}
```
- **Retorno Fora da Área (200 / available: false):**
```json
{
  "available": false,
  "reason": "OUT_OF_DELIVERY_AREA",
  "message": "Desculpe, este endereço está a 14.2 km e nossa área máxima de entrega local é de até 10 km.",
  "zipCode": "44000000",
  "district": "Distrito Rural",
  "city": "Feira de Santana",
  "state": "BA"
}
```

### Administrativa: `/api/admin/shipping/`
- `GET / POST /api/admin/shipping/zones`: Gerenciamento das zonas e preços.
- `PUT / DELETE /api/admin/shipping/zones/[id]`: Atualização e remoção de zonas.
- `GET / POST /api/admin/shipping/zipcodes`: Listagem e importação individual ou em lote (CSV).
- `DELETE /api/admin/shipping/zipcodes/[id]`: Exclusão de CEP.

---

## 9. Segurança e Checkout

- O checkout no frontend consulta `/api/shipping/calculate` para exibir a prévia de valor ao cliente.
- Ao clicar em **"Gerar PIX"** (`POST /api/orders`), o backend **recalcula obrigatoriamente o frete no servidor** a partir do CEP informado, ignorando qualquer valor monetário enviado pelo cliente. O valor do frete é somado ao total e persistido no pedido (`Order.shippingPrice`).
