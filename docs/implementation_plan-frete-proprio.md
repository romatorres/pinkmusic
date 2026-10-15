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

Cadastradas no banco de dados (tabela `ShippingZone`) e criadas/garantidas via `seed.ts`:

| Zona | Ordem | Faixa de Raio Estimado | Preço Padrão | Regiões Atendidas Típicas |
|:---:|:---:|:---:|:---:|:---|
| **Zona 1** | 1 | 0 até 3 km | R$ 10,00 | Centro, Kalilândia, Sobradinho, Brasília, Serraria Brasil, Queimadinha, Ponto Central |
| **Zona 2** | 2 | 3 até 6 km | R$ 12,00 | Lagoa Grande, Caseb, São João, Santa Mônica, Capuchinhos, Cidade Nova, Tomba, Parque Ipê |
| **Zona 3** | 3 | 6 até 10 km | R$ 15,00 | SIM (Artêmia Pires), Mangabeira, Papagaio, Conceição, Feira X, Feira VII, Feira IX |
| **Zona 4** | 4 | 10 até 12 km | R$ 18,00 | Aviário, CIS, Limoeiro, Campo Limpo, Santo Antônio dos Prazeres, Aeroporto |

---

## 4. Arquitetura de Arquivos (`src/lib/shipping/`)

| Arquivo | Responsabilidade |
|---|---|
| [`config.ts`](file:///c:/Web/pinkmusic/src/lib/shipping/config.ts) | Parâmetros da loja física, cidade, estado e raio padrão de referência. |
| [`normalize-zipcode.ts`](file:///c:/Web/pinkmusic/src/lib/shipping/normalize-zipcode.ts) | Sanitização do CEP (remoção de pontuação, validação estrita de 8 dígitos numéricos). |
| [`zone-lookup.ts`](file:///c:/Web/pinkmusic/src/lib/shipping/zone-lookup.ts) | Resolução determinística da zona pelo bairro (ViaCEP + mapeamento catalogado dos bairros de Feira de Santana) sem oscilação de GPS. |
| [`calculate-shipping.ts`](file:///c:/Web/pinkmusic/src/lib/shipping/calculate-shipping.ts) | Lógica central: verificação de cidade, enquadramento nas zonas cadastradas no banco, cache no banco e fallback. |
| [`seed.ts`](file:///c:/Web/pinkmusic/src/lib/shipping/seed.ts) | Inicialização automática das 4 zonas de entrega caso a tabela esteja vazia. |

---

## 5. Estratégia de Resolução Determinística de Zonas (`zone-lookup.ts`)

Para eliminar oscilações de APIs de GPS/mapas (que falhavam 3 a cada 5 consultas e bloqueavam clientes indevidamente), o cálculo foi simplificado para ser **100% determinístico e instantâneo**:

1. **ViaCEP (com timeout de 2.5s e cache no banco):** obtém os dados oficiais do endereço (Bairro, Cidade, Estado).
2. **Mapeamento Direto de Bairros:** normaliza o nome do bairro e enquadra diretamente na respectiva zona (Zona 1 a 4).
3. **Fallback por Prefixo de CEP:** para logradouros sem bairro ou novos loteamentos de Feira de Santana, faixas de CEP mapeiam para a zona aproximada mais segura.
4. **Alinhamento com o Banco de Dados:** o ID e o preço real cobrado vêm sempre da tabela `ShippingZone` ordenada pela distância/ordem, respeitando qualquer edição feita no painel Admin.

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
