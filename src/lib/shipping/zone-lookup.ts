/**
 * zone-lookup.ts
 *
 * Resolução Determinística de Zona de Entrega — Pink Music Instrumentos.
 * Loja: Rua JJ Seabra, Centro, Feira de Santana-BA (CEP 44002-000).
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * PRINCÍPIO CENTRAL:
 *   Dúvida NUNCA bloqueia a venda em silêncio.
 *   Só bloqueia quando há CERTEZA (bairro rural confirmado ou cidade diferente).
 *   Bairros ambíguos → NEEDS_NEIGHBORHOOD (cliente confirma o bairro).
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * CASCATA DE RESOLUÇÃO (resolveZone):
 *
 *   Passo 0 — Validação de faixa de CEP (zipRangeMin a zipRangeMax de config.ts)
 *   Passo 1 — Override manual do banco (ShippingZipOverride) — máxima prioridade
 *   Bloqueio — Prefixo rural puro (OUT_OF_AREA_PREFIXES derivado em tempo de carga)
 *   Passo 2 — Cache do banco com confiança "high" (ShippingZipCode)
 *   Passo 3 — Base local offline JSON (feira-ceps.json, 0ms)
 *   Passo 4 — APIs externas em paralelo via Promise.any (ViaCEP + BrasilAPI)
 *   Passo 5 — Interpolação no array ordenado de CEPs (gap numérico <= 60)
 *   Passo 6 — Prefixo puro de 5 dígitos (ZIP_PREFIX_ZONE_MAP gerado)
 *   Passo 7 — NEEDS_NEIGHBORHOOD (cliente confirma bairro via UI/WhatsApp)
 */

import prisma from "@/lib/prisma";
import { STORE_SHIPPING_CONFIG } from "./config";
import feiraCepsRaw from "./data/feira-ceps.json";

// ─── Tipos e Interfaces ────────────────────────────────────────────────────────

export type ZoneResolutionSource =
  | "zip_override"       // Passo 1: override manual no banco
  | "db_cache_high"      // Passo 2: cache do banco com confiança high
  | "local_json"         // Passo 3: feira-ceps.json local
  | "viacep"             // Passo 4a: ViaCEP API
  | "brasilapi"          // Passo 4b: BrasilAPI
  | "neighbor_interp"    // Passo 5: interpolação de vizinhos
  | "zip_prefix"         // Passo 6: prefixo de 5 dígitos
  | "needs_neighborhood" // Passo 7: aguarda seleção do bairro pelo cliente
  | "out_of_area";       // Passo 0 / Bloqueio: bloqueio definitivo

export type ZoneResolutionConfidence = "high" | "medium" | "low" | "none";

/** Resultado completo da resolução de zona para um CEP. */
export interface ZoneLookupResult {
  /** Número de ordem da zona (1–4) ou null se fora da área ou necessita bairro. */
  zoneOrder: number | null;
  /** Bairro identificado (pode estar vazio se não encontrado). */
  district: string;
  city: string;
  state: string;
  street: string;
  /** true = bloqueio definitivo (área rural confirmada ou fora do município). */
  isOutOfDeliveryArea?: boolean;
  /** true = bairro ambíguo, cliente precisa informar o bairro para prosseguir. */
  needsNeighborhoodSelection?: boolean;
  /** Motivo do resultado especial, para log e UI. */
  outOfDeliveryReason?: string;
  /** Como a zona foi determinada. */
  source: ZoneResolutionSource;
  /** Nível de confiança desta resolução. */
  confidence: ZoneResolutionConfidence;
}

export type FetchedAddress = {
  district: string;
  city: string;
  state: string;
  street: string;
  source: "viacep" | "brasilapi";
};

// ─── Dados locais offline e ordenação ──────────────────────────────────────────

const LOCAL_FEIRA_CEPS: Record<string, { district: string; street?: string }> =
  feiraCepsRaw as Record<string, { district: string; street?: string }>;

/** Array ordenado de todos os CEPs do JSON para busca binária de vizinhos. */
const SORTED_CEPS: string[] = Object.keys(LOCAL_FEIRA_CEPS).sort();

const TIMEOUT_VIACEP_MS    = 3500;
const TIMEOUT_BRASILAPI_MS = 2500;

// ─── Normalização ──────────────────────────────────────────────────────────────

/** Normaliza string para chave de busca (sem acento, lowercase, somente alfanuméricos). */
export function normalizeKey(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

// ─── Distritos rurais confirmados ──────────────────────────────────────────────

/**
 * Aliases normalizados de distritos rurais confirmados (sem acento, lowercase).
 * Usado para correspondência EXATA — NUNCA com includes().
 *
 * "Subaé (Tanquinho)" → alias "subaetanquinho" / "tanquinho"
 * O bairro urbano "Subaé" NÃO está aqui.
 */
export const RURAL_DISTRICT_EXACT_KEYS = new Set<string>([
  "humildes",
  "distritodehumildes",
  "distritohumildes",
  "ipuacu",
  "governadorjoaodurvalcarneiro",
  "governadorjoaodurval",
  "bonfimdefeira",
  "jaguara",
  "tiquarucu",
  "saovicente",
  "matinha",
  "jaiba",
  "mantiba",
  "distritomantiba",
  "subaetanquinho",   // Subaé (Tanquinho) — distrito rural
  "tanquinho",        // alias do Subaé (Tanquinho)
  "subaeditrito",     // alias do Subaé (Tanquinho)
  "pedraferrada",
  "limoeiro",
  "distritolimoeiro",
  "fulo",
  "fazendamorro",
  "zonarural",
  "distritorural",
  "terradurarural",
]);

/** Verifica se o bairro normalizado pertence a um distrito rural confirmado. */
export function isRuralDistrict(district: string): boolean {
  if (!district) return false;
  return RURAL_DISTRICT_EXACT_KEYS.has(normalizeKey(district));
}

// ─── Mapa estático de bairros (fallback sem banco) ─────────────────────────────

/**
 * Mapa estático de fallback: normalizedKey → zoneOrder.
 * Usado se o banco não estiver disponível e como base para a geração dos prefixos.
 *
 * Z1: 0-3km, Z2: 3-6km, Z3: 6-10km, Z4: 10-12km.
 * Bairros de fronteira classificados conforme decisões do dono da loja.
 *
 * Atualizado com:
 *   - Calumbi = Z1
 *   - Campo Limpo = Z2 (era Z3)
 *
 * IMPORTANTE: "subae" aqui refere-se ao bairro URBANO (Z2).
 * "subaetanquinho" / "tanquinho" estão em RURAL_DISTRICT_EXACT_KEYS (bloqueado).
 */
export const NEIGHBORHOOD_ZONE_MAP: Record<string, number> = {
  // ── Zona 1 (0–3 km) ───────────────────────────────────────────────────────
  centro: 1,
  chacarasaocosme: 1,
  serrariabrasil: 1,
  baraunas: 1,
  barauna: 1,
  olhosdagua: 1,
  pedradodescanso: 1,
  ruanova: 1,
  pontocentral: 1,
  jardimacacia: 1,
  jardimacacias: 1,
  lagoagrande: 1,
  cruzeiro: 1,
  queimadinha: 1,
  muchila: 1,
  capuchinhos: 1,
  calumbi: 1,

  // ── Zona 2 (3–6 km) ───────────────────────────────────────────────────────
  sobradinho: 2,
  saojoao: 2,
  caseb: 2,
  jardimcruzeiro: 2,
  parquegetuliovargas: 2,
  getuliovargas: 2,
  novaesperanca: 2,
  chaparral: 2,
  tomba: 2,
  santamonica: 2,
  brasilia: 2,
  cidadenova: 2,
  gabriela: 2,
  lagoasalgada: 2,
  parqueipe: 2,
  "35bi": 2,
  subae: 2,           // bairro URBANO Subaé → Z2
  sim: 2,
  campolimpo: 2,      // Atualizado para Z2 (era Z3)

  // ── Zona 3 (6–10 km) ──────────────────────────────────────────────────────
  conceicao: 3,
  conjuntofraternidade: 3,
  fraternidade: 3,
  pampalona: 3,
  mangabeira: 3,
  campodogadonovo: 3,
  gadonovo: 3,
  valedojacuipe: 3,
  jacuipe: 3,
  asabranca: 3,
  santoantoniodosprazeres: 3,
  prazeres: 3,
  aviario: 3,
  novohorizonte: 3,
  papagaio: 3,
  cis: 3,

  // ── Zona 4 (10–12 km) ─────────────────────────────────────────────────────
  cisnorte: 4,
  registro: 4,
  aeroporto: 4,
};

// ─── Geração em tempo de carga dos mapas de prefixos (pureza 100%) ─────────────

/**
 * Constrói ZIP_PREFIX_ZONE_MAP e OUT_OF_AREA_PREFIXES dinamicamente em tempo de carga:
 * - Analisa todas as entradas de feira-ceps.json.
 * - Inclui prefixo de 5 dígitos SOMENTE se 100% das entradas resolverem para a MESMA zona.
 * - Inclui em OUT_OF_AREA_PREFIXES SOMENTE se 100% das entradas forem de distrito rural:
 *     44099 → Humildes
 *     44039 → Mantiba
 *     44037, 44038 → Pedra Ferrada
 *     44097, 44098 → Limoeiro
 * - Ignora prefixos mistos (ex: 44080, 44052, 44076) e prefixos com bairro sem zona.
 * - Prefixos não verificáveis no JSON (44100–44149) não entram em nenhum mapa:
 *   CEPs fora do JSON seguem a cascata normal (API -> vizinho -> NEEDS_NEIGHBORHOOD).
 */
function buildPrefixMaps(
  ceps: Record<string, { district: string; street?: string }>,
  neighborhoodMap: Record<string, number>,
  ruralKeys: Set<string>
): { zoneMap: Record<string, number>; outOfAreaPrefixes: Set<string> } {
  const prefixCategories = new Map<string, Set<number | "rural" | "unknown">>();

  for (const [zip, entry] of Object.entries(ceps)) {
    const prefix5 = zip.slice(0, 5);
    const key = normalizeKey(entry.district);
    let category: number | "rural" | "unknown";

    if (ruralKeys.has(key)) {
      category = "rural";
    } else if (neighborhoodMap[key] !== undefined) {
      category = neighborhoodMap[key];
    } else {
      category = "unknown";
    }

    if (!prefixCategories.has(prefix5)) {
      prefixCategories.set(prefix5, new Set());
    }
    prefixCategories.get(prefix5)!.add(category);
  }

  const zoneMap: Record<string, number> = {};
  const outOfAreaPrefixes = new Set<string>();

  for (const [prefix5, categories] of prefixCategories.entries()) {
    if (categories.size === 1) {
      const [onlyCategory] = categories;
      if (onlyCategory === "rural") {
        outOfAreaPrefixes.add(prefix5);
      } else if (typeof onlyCategory === "number") {
        zoneMap[prefix5] = onlyCategory;
      }
    }
  }

  return { zoneMap, outOfAreaPrefixes };
}

const { zoneMap: GENERATED_ZIP_PREFIX_MAP, outOfAreaPrefixes: GENERATED_OUT_OF_AREA_PREFIXES } =
  buildPrefixMaps(LOCAL_FEIRA_CEPS, NEIGHBORHOOD_ZONE_MAP, RURAL_DISTRICT_EXACT_KEYS);

/** Mapa de prefixos puros de 5 dígitos gerado em tempo de carga a partir do JSON (100% pureza). */
export const ZIP_PREFIX_ZONE_MAP: Record<string, number> = GENERATED_ZIP_PREFIX_MAP;

/**
 * Prefixos de 5 dígitos cujos CEPs pertencem 100% a distritos rurais confirmados:
 *   44099 → Humildes
 *   44039 → Mantiba
 *   44037, 44038 → Pedra Ferrada
 *   44097, 44098 → Limoeiro
 */
export const OUT_OF_AREA_PREFIXES: Set<string> = GENERATED_OUT_OF_AREA_PREFIXES;

// ─── Funções auxiliares de resolução ──────────────────────────────────────────

/**
 * Resolve zona pelo bairro — primeiro tenta o banco (ShippingNeighborhood),
 * depois o mapa estático de fallback.
 *
 * Matching EXATO por normalizedKey ou aliases. NUNCA usa includes().
 */
export async function resolveZoneByNeighborhood(
  district: string
): Promise<{ zoneOrder: number | null; outOfArea: boolean } | null> {
  if (!district) return null;
  const key = normalizeKey(district);

  // 1. Busca no banco (normalizedKey exato)
  try {
    const record = await prisma.shippingNeighborhood.findUnique({
      where: { normalizedKey: key },
    });
    if (record) {
      return {
        zoneOrder: record.zoneOrder,
        outOfArea: record.outOfArea,
      };
    }

    // 2. Busca nos aliases (array contains exato — sem includes())
    const byAlias = await prisma.shippingNeighborhood.findFirst({
      where: { aliases: { has: key } },
    });
    if (byAlias) {
      return {
        zoneOrder: byAlias.zoneOrder,
        outOfArea: byAlias.outOfArea,
      };
    }
  } catch {
    // BD não disponível → fallback estático
  }

  // 3. Fallback estático (NEIGHBORHOOD_ZONE_MAP)
  const staticZone = NEIGHBORHOOD_ZONE_MAP[key] ?? null;
  if (staticZone !== null) {
    return { zoneOrder: staticZone, outOfArea: false };
  }

  return null;
}

/** Resolve zona pelo prefixo de 5 dígitos (somente prefixos puros gerados). */
export function resolveZoneByZipPrefix(cleanZip: string): number | null {
  const prefix = cleanZip.slice(0, 5);
  return ZIP_PREFIX_ZONE_MAP[prefix] ?? null;
}

// ─── Interpolação de vizinhos por array ordenado ──────────────────────────────

/**
 * Encontra o CEP anterior e o posterior mais próximos em SORTED_CEPS usando busca binária.
 */
function findNearestNeighbors(cleanZip: string): { prevZip: string | null; nextZip: string | null } {
  let low = 0;
  let high = SORTED_CEPS.length - 1;
  let insertIdx = SORTED_CEPS.length;

  while (low <= high) {
    const mid = (low + high) >> 1;
    if (SORTED_CEPS[mid] >= cleanZip) {
      insertIdx = mid;
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  const prevIdx = insertIdx - 1;
  let nextIdx = insertIdx;
  if (nextIdx < SORTED_CEPS.length && SORTED_CEPS[nextIdx] === cleanZip) {
    nextIdx = insertIdx + 1;
  }

  const prevZip = prevIdx >= 0 ? SORTED_CEPS[prevIdx] : null;
  const nextZip = nextIdx < SORTED_CEPS.length ? SORTED_CEPS[nextIdx] : null;
  return { prevZip, nextZip };
}

/**
 * Passo 5: Substitui a interpolação ±1/±10 por busca no array de CEPs ordenado.
 * Pega o CEP anterior e o posterior mais próximos.
 * Usa o bairro SOMENTE se:
 * - Ambos têm o mesmo prefixo de 5 dígitos do cleanZip
 * - Ambos têm o mesmo district
 * - A distância numérica de cada lado é <= neighborInterpolationMaxGap (60 de config.ts)
 * Bairro rural ou sem zona NUNCA propaga.
 */
async function resolveByNeighborInterpolation(
  cleanZip: string
): Promise<{ zoneOrder: number; district: string } | null> {
  const num = parseInt(cleanZip, 10);
  if (isNaN(num)) return null;

  const { prevZip, nextZip } = findNearestNeighbors(cleanZip);
  if (!prevZip || !nextZip) return null;

  const prevNum = parseInt(prevZip, 10);
  const nextNum = parseInt(nextZip, 10);
  if (isNaN(prevNum) || isNaN(nextNum)) return null;

  const prefix5 = cleanZip.slice(0, 5);

  // Ambos devem ter o mesmo prefixo de 5 dígitos do CEP consultado
  if (prevZip.slice(0, 5) !== prefix5 || nextZip.slice(0, 5) !== prefix5) {
    return null;
  }

  // Distância numérica de cada lado deve ser <= 60
  const maxGap = STORE_SHIPPING_CONFIG.neighborInterpolationMaxGap ?? 60;
  const prevDist = num - prevNum;
  const nextDist = nextNum - num;
  if (prevDist <= 0 || nextDist <= 0 || prevDist > maxGap || nextDist > maxGap) {
    return null;
  }

  const prevEntry = LOCAL_FEIRA_CEPS[prevZip];
  const nextEntry = LOCAL_FEIRA_CEPS[nextZip];
  if (!prevEntry || !nextEntry) return null;

  // Ambos devem ter o mesmo district
  const prevDistrict = prevEntry.district?.trim();
  const nextDistrict = nextEntry.district?.trim();
  if (!prevDistrict || !nextDistrict) return null;

  if (normalizeKey(prevDistrict) !== normalizeKey(nextDistrict)) {
    return null;
  }

  // Bairro rural NUNCA propaga
  if (isRuralDistrict(prevDistrict)) {
    return null;
  }

  // Bairro sem zona NUNCA propaga
  const r = await resolveZoneByNeighborhood(prevDistrict);
  if (!r || r.zoneOrder === null || r.outOfArea) {
    return null;
  }

  return { zoneOrder: r.zoneOrder, district: prevDistrict };
}

// ─── Consultas às APIs de CEP ─────────────────────────────────────────────────

/** Consulta ViaCEP com timeout. Rejeita se status não-ok ou se city vazia. */
async function fetchViaCep(cleanZip: string): Promise<FetchedAddress> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_VIACEP_MS);
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cleanZip}/json/`, {
      signal: controller.signal,
      next: { revalidate: 86400 },
    });
    if (!res.ok) throw new Error("ViaCEP request failed");
    const data = await res.json();
    if (!data || data.erro || !data.localidade) {
      throw new Error("ViaCEP returned error or missing city");
    }
    return {
      district: data.bairro || "",
      city: data.localidade || "",
      state: data.uf || "",
      street: data.logradouro || "",
      source: "viacep",
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Consulta BrasilAPI com timeout. Rejeita se status não-ok ou se city vazia. */
async function fetchBrasilApi(cleanZip: string): Promise<FetchedAddress> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_BRASILAPI_MS);
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cep/v1/${cleanZip}`, {
      signal: controller.signal,
    });
    if (!res.ok) throw new Error("BrasilAPI request failed");
    const data = await res.json();
    if (!data || !data.city) {
      throw new Error("BrasilAPI returned error or missing city");
    }
    return {
      district: data.neighborhood || "",
      city: data.city || "",
      state: data.state || "",
      street: data.street || "",
      source: "brasilapi",
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Consulta ViaCEP e BrasilAPI via Promise.any.
 * Retorna a primeira API com city preenchida, devolvendo o `source` junto ("viacep" | "brasilapi").
 * NUNCA chama a ViaCEP duas vezes.
 */
export async function fetchAddressData(cleanZip: string): Promise<FetchedAddress | null> {
  try {
    return await Promise.any([
      fetchViaCep(cleanZip),
      fetchBrasilApi(cleanZip),
    ]);
  } catch {
    // Todas as APIs falharam ou rejeitaram
    return null;
  }
}

// ─── Helpers de resultado ─────────────────────────────────────────────────────

function outOfAreaResult(
  district: string,
  city: string,
  state: string,
  street: string,
  reason: string
): ZoneLookupResult {
  return {
    zoneOrder: null,
    district,
    city,
    state,
    street,
    isOutOfDeliveryArea: true,
    outOfDeliveryReason: reason,
    source: "out_of_area",
    confidence: "high",
  };
}

function needsNeighborhoodResult(
  district: string,
  city: string,
  state: string,
  street: string
): ZoneLookupResult {
  return {
    zoneOrder: null,
    district,
    city,
    state,
    street,
    needsNeighborhoodSelection: true,
    outOfDeliveryReason: "NEEDS_NEIGHBORHOOD",
    source: "needs_neighborhood",
    confidence: "none",
  };
}

// ─── Função principal: resolveZone ────────────────────────────────────────────

/**
 * Resolve a zona de entrega para um CEP de 8 dígitos (já normalizado).
 *
 * Retorna ZoneLookupResult com zoneOrder 1–4, isOutOfDeliveryArea, ou
 * needsNeighborhoodSelection conforme a cascata de resolução.
 */
export async function resolveZone(cleanZip: string): Promise<ZoneLookupResult> {
  const defaultCity  = STORE_SHIPPING_CONFIG.storeCity;
  const defaultState = STORE_SHIPPING_CONFIG.storeState;
  let district = "";
  let city     = defaultCity;
  let state    = defaultState;
  let street   = "";

  const prefix5 = cleanZip.slice(0, 5);
  const zipNum  = parseInt(cleanZip, 10);

  // ══════════════════════════════════════════════════════════════════════════
  // PASSO 0 — Validação de faixa usando zipRangeMin / zipRangeMax de config.ts
  // ══════════════════════════════════════════════════════════════════════════
  const minZip = STORE_SHIPPING_CONFIG.zipRangeMin ?? 44000000;
  const maxZip = STORE_SHIPPING_CONFIG.zipRangeMax ?? 44199999;
  const isFeiraRange = !isNaN(zipNum) && zipNum >= minZip && zipNum <= maxZip;

  if (!isFeiraRange) {
    return outOfAreaResult("", city, state, street, "OUTSIDE_FEIRA_RANGE");
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PASSO 1 — Override manual (ShippingZipOverride) — ANTES do bloqueio por prefixo
  // ══════════════════════════════════════════════════════════════════════════
  try {
    const override = await prisma.shippingZipOverride.findUnique({
      where: { zipCode: cleanZip },
    });
    if (override) {
      return {
        zoneOrder: override.zoneOrder,
        district: override.district,
        city,
        state,
        street,
        source: "zip_override",
        confidence: "high",
      };
    }
  } catch {
    // BD offline → continua
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Bloqueio imediato por prefixo rural puro (derivado dinamicamente em tempo de carga)
  // ══════════════════════════════════════════════════════════════════════════
  if (OUT_OF_AREA_PREFIXES.has(prefix5)) {
    return outOfAreaResult("Distrito Rural", city, state, street, "RURAL_PREFIX_BLOCKED");
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PASSO 2 — Cache do banco (ShippingZipCode) com confiança "high"
  // ══════════════════════════════════════════════════════════════════════════
  try {
    const cached = await prisma.shippingZipCode.findUnique({
      where: { zipCode: cleanZip },
      include: { zone: true },
    });
    if (cached && cached.confidence === "high" && cached.zone?.active) {
      return {
        zoneOrder: cached.zone.order,
        district: cached.district,
        city: cached.city,
        state: cached.state,
        street: "",
        source: "db_cache_high",
        confidence: "high",
      };
    }
    // Cache low/medium → aproveita o district para os passos seguintes
    if (cached?.district) district = cached.district;
  } catch {
    // BD offline → continua
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PASSO 3 — Base local offline JSON (feira-ceps.json, 0ms)
  // ══════════════════════════════════════════════════════════════════════════
  const localEntry = LOCAL_FEIRA_CEPS[cleanZip];
  if (localEntry) {
    district = localEntry.district || district;
    street   = localEntry.street   || street;

    // Bloqueio por distrito rural confirmado (matching exato)
    if (isRuralDistrict(district)) {
      return outOfAreaResult(district, city, state, street, "RURAL_DISTRICT_CONFIRMED");
    }

    const r = await resolveZoneByNeighborhood(district);
    if (r) {
      if (r.outOfArea) {
        return outOfAreaResult(district, city, state, street, "RURAL_DISTRICT_DB");
      }
      if (r.zoneOrder !== null) {
        return {
          zoneOrder: r.zoneOrder,
          district,
          city,
          state,
          street,
          source: "local_json",
          confidence: "high",
        };
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PASSO 4 — APIs externas em paralelo (Promise.any: ViaCEP + BrasilAPI)
  // Retorna a primeira API com cidade preenchida e source identificado
  // ══════════════════════════════════════════════════════════════════════════
  const addrData = await fetchAddressData(cleanZip);
  if (addrData) {
    const apiDistrict = addrData.district;
    const apiCity     = addrData.city;
    const apiState    = addrData.state;
    const apiStreet   = addrData.street;

    // Atualiza variáveis
    if (apiDistrict) district = apiDistrict;
    if (apiCity)     city     = apiCity;
    if (apiState)    state    = apiState;
    if (apiStreet)   street   = apiStreet;

    // Verifica se é outra cidade (bloqueio definitivo)
    const isOtherCity =
      apiCity &&
      apiCity.toLowerCase().trim() !== STORE_SHIPPING_CONFIG.storeCity.toLowerCase().trim();

    if (isOtherCity) {
      return outOfAreaResult(district, city, state, street, "OUTSIDE_MUNICIPALITY");
    }

    // Bloqueio por distrito rural via API
    if (district && isRuralDistrict(district)) {
      return outOfAreaResult(district, city, state, street, "RURAL_DISTRICT_API");
    }

    // Tenta resolver a zona pelo bairro retornado pela API
    if (district) {
      const r = await resolveZoneByNeighborhood(district);
      if (r) {
        if (r.outOfArea) {
          return outOfAreaResult(district, city, state, street, "RURAL_DISTRICT_DB");
        }
        if (r.zoneOrder !== null) {
          return {
            zoneOrder: r.zoneOrder,
            district,
            city,
            state,
            street,
            source: addrData.source,
            confidence: "high",
          };
        }
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PASSO 5 — Interpolação no array de CEPs ordenado (gap <= 60)
  // ══════════════════════════════════════════════════════════════════════════
  const interpolated = await resolveByNeighborInterpolation(cleanZip);
  if (interpolated) {
    return {
      zoneOrder: interpolated.zoneOrder,
      district: district || interpolated.district,
      city,
      state,
      street,
      source: "neighbor_interp",
      confidence: "medium",
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PASSO 6 — Prefixo puro de 5 dígitos (gerado em tempo de carga)
  // ══════════════════════════════════════════════════════════════════════════
  const zoneByPrefix = resolveZoneByZipPrefix(cleanZip);
  if (zoneByPrefix !== null) {
    return {
      zoneOrder: zoneByPrefix,
      district: district || "Feira de Santana",
      city,
      state,
      street,
      source: "zip_prefix",
      confidence: "medium",
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PASSO 7 — NEEDS_NEIGHBORHOOD
  // CEP dentro da faixa de Feira mas bairro não identificado.
  // Dúvida NUNCA bloqueia a venda: o cliente confirma o bairro.
  // Registra no banco com await (captura erro silenciosamente).
  // ══════════════════════════════════════════════════════════════════════════
  try {
    await prisma.shippingUnresolvedZip.upsert({
      where: { zipCode: cleanZip },
      update: {
        district: district || null,
        city: city || null,
        state: state || null,
        hitCount: { increment: 1 },
        updatedAt: new Date(),
      },
      create: {
        zipCode: cleanZip,
        district: district || null,
        city: city || null,
        state: state || null,
        reason: "NO_NEIGHBORHOOD_MATCH",
      },
    });
  } catch {
    /* silencioso se banco indisponível */
  }

  return needsNeighborhoodResult(district, city, state, street);
}

// ─── Alias de compatibilidade (mantém imports antigos funcionando) ─────────────

/** @deprecated Use resolveZone() */
export const resolveZoneOrder = resolveZone;

/** @deprecated Use resolveZone() */
export function isDistrictOutOfDeliveryArea(district: string): boolean {
  return isRuralDistrict(district);
}
