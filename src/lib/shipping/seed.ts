/**
 * seed.ts
 *
 * Inicializa as zonas de entrega, os 53 bairros de Feira de Santana classificados
 * pelo relatório de validação geográfica, e os overrides manuais de CEP.
 *
 * Executável via: npm run seed:shipping
 * Com atualização forçada de bairros: npm run seed:shipping -- --force-neighborhoods
 *
 * ZONAS:
 *   Z1: 0–3 km   → R$ 10,00
 *   Z2: 3–6 km   → R$ 12,00
 *   Z3: 6–10 km  → R$ 15,00
 *   Z4: 10–12 km → R$ 18,00
 */

import prisma from "@/lib/prisma";

/** Normaliza string para chave de busca (sem acento, lowercase, sem espaço). */
export function normalizeKey(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

type NeighborhoodEntry = {
  name: string;
  aliases?: string[]; // apenas grafias reais alternativas
};

const ZONE1_NEIGHBORHOODS: NeighborhoodEntry[] = [
  { name: "Centro" },
  { name: "Chácara São Cosme", aliases: ["saocosme"] },
  { name: "Serraria Brasil" },
  { name: "Baraúna", aliases: ["baraunas"] },
  { name: "Olhos D'Água" },
  { name: "Pedra do Descanso" },
  { name: "Rua Nova" },
  { name: "Ponto Central" },
  { name: "Jardim Acácia", aliases: ["jardimacacias"] },
  { name: "Lagoa Grande" },
  { name: "Cruzeiro" },
  { name: "Queimadinha" },
  { name: "Muchila" },
  { name: "Capuchinhos" },
  { name: "Calumbi" },
];

const ZONE2_NEIGHBORHOODS: NeighborhoodEntry[] = [
  { name: "Sobradinho" },
  { name: "São João" },
  { name: "CASEB" },
  { name: "Jardim Cruzeiro" },
  { name: "Parque Getúlio Vargas", aliases: ["getuliovargas"] },
  { name: "Nova Esperança" },
  { name: "Chaparral" },
  { name: "Tomba" },
  { name: "Santa Mônica" },
  { name: "Brasília" },
  { name: "Cidade Nova" },
  { name: "Gabriela" },
  { name: "Lagoa Salgada" },
  { name: "Parque Ipê" },
  { name: "35º BI", aliases: ["35bi"] },
  // Subaé URBANO (≠ Subaé Tanquinho que é outOfArea)
  { name: "Subaé" },
  { name: "SIM" },
  { name: "Campo Limpo" },
];

const ZONE3_NEIGHBORHOODS: NeighborhoodEntry[] = [
  { name: "Conceição" },
  { name: "Conjunto Fraternidade", aliases: ["fraternidade"] },
  { name: "Pampalona" },
  { name: "Mangabeira" },
  { name: "Campo do Gado Novo", aliases: ["gadonovo"] },
  { name: "Vale do Jacuípe", aliases: ["jacuipe"] },
  { name: "Asa Branca" },
  { name: "Santo Antônio dos Prazeres", aliases: ["prazeres"] },
  { name: "Aviário" },
  { name: "Novo Horizonte" },
  { name: "Papagaio" },
  { name: "CIS" },
];

const ZONE4_NEIGHBORHOODS: NeighborhoodEntry[] = [
  { name: "CIS Norte" },
  { name: "Registro" },
  { name: "Aeroporto" },
];

// Distritos rurais CONFIRMADOS → outOfArea = true
const OUT_OF_AREA_NEIGHBORHOODS: NeighborhoodEntry[] = [
  { name: "Humildes", aliases: ["distritodehumildes", "distritohumildes"] },
  { name: "Mantiba", aliases: ["distritomantiba"] },
  { name: "Subaé (Tanquinho)", aliases: ["subaetanquinho", "tanquinho"] },
  { name: "Pedra Ferrada" },
  { name: "Limoeiro", aliases: ["distritolimoeiro"] },
];

// Overrides manuais de CEP específico
const ZIP_OVERRIDES = [
  {
    zipCode: "44068030",
    district: "Conjunto Fraternidade",
    zoneOrder: 3,
    note: "CEP 44068-030 pertence ao Conjunto Fraternidade (Z3) apesar do prefixo geral.",
  },
];

type ZoneSpec = {
  order: number;
  name: string;
  description: string;
  minDistance: number;
  maxDistance: number;
  price: number;
};

const DEFAULT_ZONES: ZoneSpec[] = [
  {
    order: 1,
    name: "Zona 1",
    description: "0 até 3 km (Centro e bairros adjacentes)",
    minDistance: 0,
    maxDistance: 3,
    price: 10.0,
  },
  {
    order: 2,
    name: "Zona 2",
    description: "Acima de 3 até 6 km (Região intermediária de Feira)",
    minDistance: 3,
    maxDistance: 6,
    price: 12.0,
  },
  {
    order: 3,
    name: "Zona 3",
    description: "Acima de 6 até 10 km (Região perimetral e anel viário)",
    minDistance: 6,
    maxDistance: 10,
    price: 15.0,
  },
  {
    order: 4,
    name: "Zona 4",
    description: "Acima de 10 até 12 km (Bairros mais distantes)",
    minDistance: 10,
    maxDistance: 12,
    price: 18.0,
  },
];

/**
 * Garante que existem exatamente 4 zonas com order 1..4 sem duplicatas.
 */
async function ensureZones(): Promise<Record<number, { id: string }>> {
  const zoneRecords: Record<number, { id: string }> = {};

  for (const spec of DEFAULT_ZONES) {
    // Busca por order primeiro
    let zone = await prisma.shippingZone.findFirst({
      where: { order: spec.order },
    });

    if (!zone) {
      // Se não achou por order, tenta pelo nome para evitar duplicar
      const byName = await prisma.shippingZone.findFirst({
        where: { name: spec.name },
      });
      if (byName) {
        zone = await prisma.shippingZone.update({
          where: { id: byName.id },
          data: { order: spec.order, active: true },
        });
      } else {
        console.log(`[shipping/seed] Criando ${spec.name}...`);
        zone = await prisma.shippingZone.create({
          data: {
            order: spec.order,
            name: spec.name,
            description: spec.description,
            minDistance: spec.minDistance,
            maxDistance: spec.maxDistance,
            price: spec.price,
            active: true,
          },
        });
      }
    }
    zoneRecords[spec.order] = zone;
  }

  return zoneRecords;
}

/**
 * Semeia bairros. Por padrão, NÃO sobrescreve edições feitas pelo admin (update: {}).
 * Se forceUpdate for true (--force-neighborhoods), atualiza os campos.
 */
async function seedNeighborhoods(
  entries: NeighborhoodEntry[],
  zoneId: string | null,
  zoneOrder: number | null,
  outOfArea = false,
  forceUpdate = false
) {
  for (const entry of entries) {
    const key = normalizeKey(entry.name);
    await prisma.shippingNeighborhood.upsert({
      where: { normalizedKey: key },
      update: forceUpdate
        ? {
            name: entry.name,
            aliases: entry.aliases ?? [],
            zoneId,
            zoneOrder,
            outOfArea,
          }
        : {},
      create: {
        name: entry.name,
        normalizedKey: key,
        aliases: entry.aliases ?? [],
        zoneId,
        zoneOrder,
        outOfArea,
      },
    });
  }
}

async function seedZipOverrides() {
  for (const ov of ZIP_OVERRIDES) {
    await prisma.shippingZipOverride.upsert({
      where: { zipCode: ov.zipCode },
      update: {
        district: ov.district,
        zoneOrder: ov.zoneOrder,
        note: ov.note,
      },
      create: ov,
    });
  }
}

/**
 * Função principal de seed:
 * 1. Limpa cache de palpites antigos (deleteMany).
 * 2. Garante exatamente 4 zonas com order 1..4.
 * 3. Faz upsert dos bairros (sem sobrescrever admin, exceto --force-neighborhoods).
 * 4. Faz upsert dos overrides manuais.
 */
export async function ensureDefaultShippingZonesAndZipCodes(options?: {
  forceNeighborhoods?: boolean;
}) {
  const force =
    options?.forceNeighborhoods ??
    process.argv.includes("--force-neighborhoods");

  console.log(
    `[shipping/seed] Iniciando seed de frete (forceNeighborhoods: ${force})...`
  );

  // 1. Limpa cache de CEPs
  await prisma.shippingZipCode.deleteMany();
  console.log("[shipping/seed] Cache ShippingZipCode limpo com sucesso.");

  // 2. Garante as 4 zonas com order 1..4 sem duplicatas
  const zones = await ensureZones();

  // 3. Semeia bairros respeitando edições do admin
  await seedNeighborhoods(ZONE1_NEIGHBORHOODS, zones[1].id, 1, false, force);
  await seedNeighborhoods(ZONE2_NEIGHBORHOODS, zones[2].id, 2, false, force);
  await seedNeighborhoods(ZONE3_NEIGHBORHOODS, zones[3].id, 3, false, force);
  await seedNeighborhoods(ZONE4_NEIGHBORHOODS, zones[4].id, 4, false, force);
  await seedNeighborhoods(OUT_OF_AREA_NEIGHBORHOODS, null, null, true, force);
  console.log("[shipping/seed] 53 bairros processados.");

  // 4. Overrides manuais
  await seedZipOverrides();
  console.log("[shipping/seed] Overrides manuais processados.");
}

// Execução direta como script CLI (npm run seed:shipping)
if (process.argv[1]?.includes("seed")) {
  ensureDefaultShippingZonesAndZipCodes()
    .then(() => {
      console.log("[shipping/seed] Concluído com sucesso.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("[shipping/seed] Falha:", err);
      process.exit(1);
    });
}
