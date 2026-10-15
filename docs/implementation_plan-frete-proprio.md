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
| [`config.ts`](file:///c:/Web/pinkmusic/src/lib/shipping/config.ts) | Parâmetros da loja física, cidade, estado e raio máximo de entrega rápida (12.0 km). |
| [`normalize-zipcode.ts`](file:///c:/Web/pinkmusic/src/lib/shipping/normalize-zipcode.ts) | Sanitização do CEP (remoção de pontuação, validação estrita de 8 dígitos numéricos). |
| [`data/feira-ceps.json`](file:///c:/Web/pinkmusic/src/lib/shipping/data/feira-ceps.json) | Base local offline com mais de 800 logradouros/CEPs e bairros de Feira de Santana (~74 KB, leitura em 0ms). |
| [`zone-lookup.ts`](file:///c:/Web/pinkmusic/src/lib/shipping/zone-lookup.ts) | Resolução determinística da zona pelo bairro (base local JSON + ViaCEP + bloqueio de distritos > 12 km + Zona 3 segura). |
| [`calculate-shipping.ts`](file:///c:/Web/pinkmusic/src/lib/shipping/calculate-shipping.ts) | Lógica central: cálculo no checkout, distância estimada da faixa, bloqueio de áreas rurais e persistência. |
| [`seed.ts`](file:///c:/Web/pinkmusic/src/lib/shipping/seed.ts) | Inicialização automática das 4 zonas de entrega caso a tabela esteja vazia. |

---

## 5. Estratégia de Resolução Determinística e Segurança (`zone-lookup.ts`)

Para eliminar oscilações de APIs de GPS/mapas e garantir que o frete nunca seja negado indevidamente para a área urbana, o cálculo opera em **5 camadas ágeis**:

1. **Bloqueio de Distritos Rurais (> 12 km):** CEPs ou bairros pertencentes a distritos distantes como Humildes, Ipuaçu, Bonfim de Feira, Jaguara, Tiquaruçu, Maria Quitéria e Matinha são interceptados e bloqueados com orientação amigável para combinar frete especial no WhatsApp.
2. **Base Local Offline (`feira-ceps.json`):** Resposta imediata em **0ms** para os principais CEPs e ruas de Feira de Santana, sem depender de internet ou APIs externas.
3. **Mapeamento Direto de Bairros:** Normaliza o nome do bairro e enquadra diretamente na respectiva zona (Zona 1 a 4).
4. **Prefixo Urbano do CEP (5 dígitos):** Mapeia blocos numéricos urbanos para a zona vizinha mais próxima.
5. **Rede de Segurança Urbana (Zona 3 = R$ 15,00):** Se o cliente morar em um endereço urbano de Feira de Santana (CEPs 440xx/441xx) novo ou não catalogado em nenhuma base, **o frete NUNCA é negado**: ele é aprovado com segurança na Zona 3, permitindo a conclusão da venda.

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
