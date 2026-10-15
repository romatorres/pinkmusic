/**
 * zone-lookup.ts
 *
 * Resolução Determinística de Zona de Entrega (sem GPS, sem oscilações de cálculo).
 *
 * Estrutura em camadas:
 *   0. Bloqueio de Distritos Rurais (> 12 km da loja central: Humildes, Ipuaçu, Bonfim de Feira, etc.)
 *   1. Exceções catalogadas manuais (KNOWN_SPECIAL_ZIPS)
 *   2. Base local de CEPs de Feira de Santana (feira-ceps.json) — instantâneo em 0ms
 *   3. Busca em APIs de CEP (ViaCEP / BrasilAPI) com timeout rápido de segurança
 *   4. Prefixo urbano do CEP (5 dígitos)
 *   5. Zona de Segurança Padrão (Zona 3 = R$ 15,00) para qualquer CEP urbano não catalogado
 */

import { STORE_SHIPPING_CONFIG } from "./config";
import feiraCepsRaw from "./data/feira-ceps.json";

const LOCAL_FEIRA_CEPS: Record<string, { district: string; street?: string }> =
  feiraCepsRaw as Record<string, { district: string; street?: string }>;

const TIMEOUT_MS = 3500;

/** Representa o resultado de uma resolução de zona por CEP. */
export interface ZoneLookupResult {
  /** Número de ordem da zona (1–4) ou null se fora da área de entrega. */
  zoneOrder: number | null;
  /** Bairro identificado */
  district: string;
  /** Cidade identificada */
  city: string;
  /** Estado identificado */
  state: string;
  /** Logradouro identificado */
  street: string;
  /** Indica se está fora do raio máximo de entrega (> 12 km / distrito rural) */
  isOutOfDeliveryArea?: boolean;
  /** Motivo da rejeição se houver */
  outOfDeliveryReason?: string;
  /** Fonte que determinou a zona */
  source:
    | "local_database_json"
    | "known_special_zip"
    | "neighborhood_map"
    | "zip_prefix"
    | "safe_default_zone3"
    | "out_of_area";
}

/** Normaliza string para chave de busca (sem acento, lowercase, sem espaço). */
export function normalizeKey(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Distritos e áreas rurais de Feira de Santana que ultrapassam o raio de 12 km
 * da loja física (Kalilândia / Centro) e ficam inviáveis para entrega rápida de motoboy.
 */
export const OUT_OF_DELIVERY_DISTRICTS: string[] = [
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
  "tanquinho",
  "fulo",
  "fazendamorro",
  "zonarural",
  "distritorural",
  "povoado",
  "terradurarural",
  "candealrural",
];

/**
 * Prefixos de CEP dos distritos rurais de Feira de Santana (> 12 km a 50 km).
 * Bloqueados na raiz para evitar que clientes rurais aprovem frete local de motoboy.
 */
export const OUT_OF_DELIVERY_PREFIXES = new Set([
  "44110", // Maria Quitéria / São José das Itaporas (~18 km)
  "44115", // Matinha (~16 km)
  "44120", // Bonfim de Feira (~35 km)
  "44125", // Jaguara (~45 km)
  "44130", // Tiquaruçu / São Vicente (~30 km)
  "44135", // Humildes (~20 km)
  "44140", // Ipuaçu (~28 km)
  "44145", // Jaíba (~16 km)
  "44149", // Demais distritos rurais limítrofes
]);

/** Verifica se um bairro/distrito pertence à área rural fora do raio de entrega. */
export function isDistrictOutOfDeliveryArea(district: string): boolean {
  if (!district) return false;
  const key = normalizeKey(district);
  return OUT_OF_DELIVERY_DISTRICTS.some((d) => key.includes(d));
}

/**
 * Mapa de bairros urbanos de Feira de Santana → número da zona (1 a 4).
 *
 * Zona 1: Centro e imediações diretas (até 3 km da loja)
 * Zona 2: Bairros intermediários (3 a 6 km)
 * Zona 3: Bairros perimetrais / expansão urbana (6 a 10 km)
 * Zona 4: Bairros distantes / limites urbanos (10 a 12 km)
 */
export const NEIGHBORHOOD_ZONE_MAP: Record<string, number> = {
  // ── Zona 1 (0 a 3 km da loja) ──────────────────────────────────────────────
  centro: 1,
  kalilandia: 1,
  caseb: 1,
  saojoao: 1,
  queimadinha: 1,
  pontocentral: 1,
  sobradinho: 1,
  estacaonova: 1,
  coroneljosedepinto: 1,
  tanquedanacao: 1,
  baraunas: 1,
  parqueipe: 1,
  parquegetuliovargas: 1,
  cruzeiro: 1,
  jardimcruzeiro: 1,
  conceicao: 1,
  conceicaoi: 1,

  // ── Zona 2 (3 a 6 km) ──────────────────────────────────────────────────────
  cidadenova: 2,
  tomba: 2,
  mangabeira: 2,
  papagaio: 2,
  geisel: 2,
  asabranca: 2,
  novohorizonte: 2,
  conceicaoii: 2,
  santamonica: 2,
  santamonica2: 2,
  santamonicaico: 2,
  capuchinhos: 2,
  brasilia: 2,
  serrariabrasil: 2,
  olhosdagua: 2,
  ruanova: 2,
  aeroporto: 2,
  lagoagrande: 2,
  gabriela: 2,
  moradadasarvores: 2,
  jardimacacia: 2,
  panorama: 2,

  // ── Zona 3 (6 a 10 km) ─────────────────────────────────────────────────────
  muchila: 3,
  feirax: 3,
  feiravii: 3,
  feira7: 3,
  feiraiv: 3,
  fraternidade: 3,
  conjuntofraternidade: 3,
  parquepanorama: 3,
  sitiomathias: 3,
  chacarasdoroque: 3,
  chacarasaoroque: 3,
  pedradodescanso: 3,
  vilaolimpia: 3,
  campolimpo: 3,
  sitionovo: 3,
  calumbi: 3,
  subae: 3,
  sim: 3,
  artemiapires: 3,

  // ── Zona 4 (10 a 12 km - Limite Máximo Viável) ──────────────────────────────
  feiraix: 4,
  cis: 4,
  aviario: 4,
  santoantoniodosprazeres: 4,
  registro: 4,
  limoeiro: 4,
  campoazul: 4,
};

/**
 * CEPs específicos conhecidos que necessitam de zoneamento direto
 */
export const KNOWN_SPECIAL_ZIPS: Record<
  string,
  { zoneOrder: number; district: string }
> = {
  // Conjunto Fraternidade / Tomba periférico (~6 a 7 km da loja)
  "44068030": { zoneOrder: 3, district: "Conjunto Fraternidade" },
};

/**
 * Mapa de prefixo dos 5 primeiros dígitos do CEP → número da zona.
 * Somente prefixos urbanos dentro do raio de 12 km.
 */
export const ZIP_PREFIX_ZONE_MAP: Record<string, number> = {
  // Centro / Kalilândia / Queimadinha — Zona 1
  "44001": 1, "44002": 1, "44003": 1, "44004": 1, "44005": 1,
  "44006": 1, "44007": 1, "44008": 1, "44009": 1, "44010": 1,

  // Cidade Nova / Sobradinho / Tomba inicial — Zona 2
  "44050": 2, "44051": 2, "44052": 2, "44053": 2, "44054": 2,
  "44055": 2, "44056": 2, "44057": 2, "44058": 2, "44059": 2,
  "44060": 2, "44061": 2, "44062": 2, "44063": 2, "44064": 2,
  "44065": 2, "44066": 2, "44067": 2, "44069": 2,
  "44070": 2, "44071": 2, "44072": 2, "44073": 2, "44074": 2,
  "44075": 2, "44076": 2, "44077": 2, "44078": 2, "44079": 2,
  "44080": 2,

  // Fraternidade / SIM / Feira X / Capuchinhos / Tomba Sul — Zona 3
  "44068": 3,
  "44081": 3, "44082": 3, "44083": 3, "44084": 3, "44085": 3,
  "44086": 3, "44087": 3, "44088": 3, "44089": 3, "44090": 3,
  "44091": 3, "44092": 3, "44093": 3, "44094": 3, "44095": 3,
  "44096": 3, "44097": 3, "44098": 3, "44099": 3, "44100": 3,
  "44101": 3, "44102": 3, "44103": 3, "44104": 3, "44105": 3,
  "44106": 3, "44107": 3, "44108": 3, "44109": 3,

  // Feira IX / CIS / Aviário / Santo Antônio dos Prazeres (10 a 12 km) — Zona 4
  "44111": 4, "44112": 4, "44113": 4, "44114": 4, "44116": 4,
  "44117": 4, "44118": 4, "44119": 4, "44121": 4, "44122": 4,
};

/** Resolve zona pelo bairro normalizado. */
export function resolveZoneByNeighborhood(district: string): number | null {
  if (!district) return null;
  const key = normalizeKey(district);
  return NEIGHBORHOOD_ZONE_MAP[key] ?? null;
}

/** Resolve zona pelo prefixo do CEP (5 dígitos). */
export function resolveZoneByZipPrefix(cleanZip: string): number | null {
  const prefix = cleanZip.slice(0, 5);
  return ZIP_PREFIX_ZONE_MAP[prefix] ?? null;
}

/** Consulta ViaCEP oficial com timeout rápido. */
export async function fetchViaCep(cleanZip: string): Promise<{
  district: string;
  city: string;
  state: string;
  street: string;
} | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(`https://viacep.com.br/ws/${cleanZip}/json/`, {
      signal: controller.signal,
      next: { revalidate: 86400 },
    });
    clearTimeout(timer);

    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.erro) return null;

    return {
      district: data.bairro || "",
      city: data.localidade || "",
      state: data.uf || "",
      street: data.logradouro || "",
    };
  } catch {
    return null;
  }
}

/** Consulta resiliente de endereço (ViaCEP com fallback BrasilAPI). */
export async function fetchAddressData(cleanZip: string): Promise<{
  district: string;
  city: string;
  state: string;
  street: string;
} | null> {
  const viaCep = await fetchViaCep(cleanZip);
  if (viaCep && (viaCep.district || viaCep.city)) {
    return viaCep;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`https://brasilapi.com.br/api/cep/v1/${cleanZip}`, {
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      if (data && data.city) {
        return {
          district: data.neighborhood || "",
          city: data.city || "",
          state: data.state || "",
          street: data.street || "",
        };
      }
    }
  } catch {
    // Silencioso
  }

  return null;
}

/**
 * Resolve qual zona de entrega (1–4) corresponde a um CEP.
 *
 * Bloqueia distritos rurais (> 12 km da loja física).
 * Para CEPs urbanos não catalogados, enquadra na Zona 3 como fallback seguro.
 */
export async function resolveZoneOrder(cleanZip: string): Promise<ZoneLookupResult> {
  let district = "";
  let city = STORE_SHIPPING_CONFIG.storeCity;
  let state = STORE_SHIPPING_CONFIG.storeState;
  let street = "";

  const prefix5 = cleanZip.slice(0, 5);

  // ── Regra 0: Bloqueio Imediato por Prefixo de Distrito Rural (> 12 km) ──────
  if (OUT_OF_DELIVERY_PREFIXES.has(prefix5)) {
    return {
      zoneOrder: null,
      district: "Distrito Rural",
      city,
      state,
      street,
      isOutOfDeliveryArea: true,
      outOfDeliveryReason: "DISTRICT_EXCEEDS_12KM",
      source: "out_of_area",
    };
  }

  // ── Camada 1: Exceção Catalogada Manual (KNOWN_SPECIAL_ZIPS) ────────────────
  const specialMatch = KNOWN_SPECIAL_ZIPS[cleanZip];
  if (specialMatch) {
    return {
      zoneOrder: specialMatch.zoneOrder,
      district: specialMatch.district,
      city,
      state,
      street,
      source: "known_special_zip",
    };
  }

  // ── Camada 2: Base Local Offline JSON (0ms) ─────────────────────────────────
  const localMatch = LOCAL_FEIRA_CEPS[cleanZip];
  if (localMatch) {
    district = localMatch.district;
    street = localMatch.street || "";

    if (isDistrictOutOfDeliveryArea(district)) {
      return {
        zoneOrder: null,
        district,
        city,
        state,
        street,
        isOutOfDeliveryArea: true,
        outOfDeliveryReason: "DISTRICT_EXCEEDS_12KM",
        source: "out_of_area",
      };
    }

    const zoneByNeighborhood = resolveZoneByNeighborhood(district);
    if (zoneByNeighborhood !== null) {
      return {
        zoneOrder: zoneByNeighborhood,
        district,
        city,
        state,
        street,
        source: "local_database_json",
      };
    }
  }

  // ── Camada 3: Busca de Endereço em APIs de CEP ──────────────────────────────
  const addrData = await fetchAddressData(cleanZip);
  if (addrData) {
    district = addrData.district || district;
    city = addrData.city || city;
    state = addrData.state || state;
    street = addrData.street || street;

    // Se a API externa retornou um distrito rural > 12km, bloqueia
    if (isDistrictOutOfDeliveryArea(district)) {
      return {
        zoneOrder: null,
        district,
        city,
        state,
        street,
        isOutOfDeliveryArea: true,
        outOfDeliveryReason: "DISTRICT_EXCEEDS_12KM",
        source: "out_of_area",
      };
    }

    const zoneByNeighborhood = resolveZoneByNeighborhood(district);
    if (zoneByNeighborhood !== null) {
      return {
        zoneOrder: zoneByNeighborhood,
        district,
        city,
        state,
        street,
        source: "neighborhood_map",
      };
    }
  }

  // ── Camada 4: Prefixo Urbano de 5 Dígitos ───────────────────────────────────
  const zoneByPrefix = resolveZoneByZipPrefix(cleanZip);
  if (zoneByPrefix !== null) {
    return {
      zoneOrder: zoneByPrefix,
      district: district || "Feira de Santana",
      city,
      state,
      street,
      source: "zip_prefix",
    };
  }

  // ── Camada 5: Zona de Segurança Padrão (Zona 3 = R$ 15,00) ───────────────────
  // Para qualquer CEP urbano de Feira (iniciando em 440xx ou 441xx) não reconhecido,
  // nunca nega o frete ao cliente: aprova com segurança na Zona 3.
  const isFeiraRange = cleanZip.startsWith("440") || cleanZip.startsWith("441");
  if (isFeiraRange) {
    return {
      zoneOrder: 3, // Zona 3 Segura
      district: district || "Feira de Santana",
      city,
      state,
      street,
      source: "safe_default_zone3",
    };
  }

  // Fora de Feira de Santana
  return {
    zoneOrder: null,
    district: district || "Outra Cidade",
    city,
    state,
    street,
    isOutOfDeliveryArea: true,
    outOfDeliveryReason: "OUTSIDE_MUNICIPALITY",
    source: "out_of_area",
  };
}
