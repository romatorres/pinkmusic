/**
 * zone-lookup.ts
 *
 * Resolução de Zona de Entrega por Bairro (sem GPS, sem cálculo de distância).
 *
 * Estratégia em camadas, da mais confiável para a menos confiável:
 *   1. ViaCEP → obtém bairro/cidade (gratuito, sem chave de API)
 *   2. Tabela local BAIRRO → ZONA (cobertura da maioria dos bairros de Feira de Santana)
 *   3. Fallback por prefixo CEP → zona (para bairros ainda não mapeados)
 *   4. Zona padrão de segurança (a mais próxima da loja = Zona 1)
 *
 * Vantagens sobre o sistema anterior baseado em GPS:
 *   - Sem dependência de AwesomeAPI, Nominatim, Google Maps
 *   - Sem cálculo Haversine (que oscilava conforme qualidade do GPS)
 *   - Resultado determinístico: mesmo CEP → mesma zona sempre
 *   - Cache no banco após primeira consulta: respostas instantâneas
 */

import { STORE_SHIPPING_CONFIG } from "./config";

const TIMEOUT_MS = 5000;

/** Representa o resultado de uma resolução de zona por CEP. */
export interface ZoneLookupResult {
  /** Número de ordem da zona (1–4) ou null se não identificado. */
  zoneOrder: number | null;
  /** Bairro obtido pelo ViaCEP */
  district: string;
  /** Cidade obtida pelo ViaCEP */
  city: string;
  /** Estado obtido pelo ViaCEP */
  state: string;
  /** Logradouro obtido pelo ViaCEP */
  street: string;
  /** Fonte que determinou a zona */
  source: "neighborhood_map" | "zip_prefix" | "default_fallback";
}

/** Normaliza string para chave de busca (sem acento, lowercase, sem espaço). */
function normalizeKey(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Mapa de bairros de Feira de Santana → número da zona (1 a 4).
 *
 * Zona 1: Centro e bairros imediatamente adjacentes (até ~3 km da loja)
 * Zona 2: Bairros intermediários (3 a 6 km)
 * Zona 3: Bairros perimetrais (6 a 10 km)
 * Zona 4: Bairros mais distantes / anel viário (10 a 12 km)
 *
 * Chave: normalizeKey(nome do bairro)
 */
export const NEIGHBORHOOD_ZONE_MAP: Record<string, number> = {
  // ── Zona 1 ─────────────────────────────────────────────────────────────────
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

  // ── Zona 2 ─────────────────────────────────────────────────────────────────
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
  capuchinhos: 2,
  brasilia: 2,
  serrariabrasil: 2,
  olhosdagua: 2,
  ruanova: 2,
  aeroporto: 2,
  lagoagrande: 2,
  gabriela: 2,
  moradadasarvores: 2,

  // ── Zona 3 ─────────────────────────────────────────────────────────────────
  muchila: 3,
  feirax: 3,
  feiravii: 3,
  feiraiv: 3,
  chacarasdoroque: 3,
  chacarasaoroque: 3,
  pedradodescanso: 3,
  vilaolimpia: 3,
  campolimpo: 3,
  sitionovo: 3,
  calumbi: 3,
  subae: 3,
  sim: 3,

  // ── Zona 4 ─────────────────────────────────────────────────────────────────
  feiraix: 4,
  cis: 4,
  aviario: 4,
  santoantoniodosprazeres: 4,
  registro: 4,
};

/**
 * Mapa de prefixo dos 5 primeiros dígitos do CEP → número da zona.
 *
 * Utilizado como fallback quando o bairro não está no NEIGHBORHOOD_ZONE_MAP.
 * CEPs de Feira de Santana variam de 44001 a 44139 (aproximadamente).
 */
export const ZIP_PREFIX_ZONE_MAP: Record<string, number> = {
  // Centro / Kalilândia / Queimadinha — Zona 1
  "44001": 1, "44002": 1, "44003": 1, "44004": 1, "44005": 1,
  "44006": 1, "44007": 1, "44008": 1, "44009": 1, "44010": 1,

  // Cidade Nova / Sobradinho / Tomba — Zona 2
  "44050": 2, "44051": 2, "44052": 2, "44053": 2, "44054": 2,
  "44055": 2, "44056": 2, "44057": 2, "44058": 2, "44059": 2,
  "44060": 2, "44061": 2, "44062": 2, "44063": 2, "44064": 2,
  "44065": 2, "44066": 2, "44067": 2, "44068": 2, "44069": 2,
  "44070": 2, "44071": 2, "44072": 2, "44073": 2, "44074": 2,
  "44075": 2, "44076": 2, "44077": 2, "44078": 2, "44079": 2,
  "44080": 2,

  // SIM / Feira X / Capuchinhos — Zona 3
  "44081": 3, "44082": 3, "44083": 3, "44084": 3, "44085": 3,
  "44086": 3, "44087": 3, "44088": 3, "44089": 3, "44090": 3,
  "44091": 3, "44092": 3, "44093": 3, "44094": 3, "44095": 3,
  "44096": 3, "44097": 3, "44098": 3, "44099": 3, "44100": 3,
  "44101": 3, "44102": 3, "44103": 3, "44104": 3, "44105": 3,
  "44106": 3, "44107": 3, "44108": 3, "44109": 3, "44110": 3,

  // Feira IX / CIS / Aviário / bairros mais distantes — Zona 4
  "44111": 4, "44112": 4, "44113": 4, "44114": 4, "44115": 4,
  "44116": 4, "44117": 4, "44118": 4, "44119": 4, "44120": 4,
  "44121": 4, "44122": 4, "44123": 4, "44124": 4, "44125": 4,
  "44126": 4, "44127": 4, "44128": 4, "44129": 4, "44130": 4,
  "44131": 4, "44132": 4, "44133": 4, "44134": 4, "44135": 4,
  "44136": 4, "44137": 4, "44138": 4, "44139": 4,
};

/**
 * Resolve o número de ordem da zona (1–4) para um determinado bairro.
 * Retorna null se o bairro não for reconhecido.
 */
export function resolveZoneByNeighborhood(district: string): number | null {
  if (!district) return null;
  const key = normalizeKey(district);
  return NEIGHBORHOOD_ZONE_MAP[key] ?? null;
}

/**
 * Resolve o número de ordem da zona (1–4) para um prefixo de CEP de 5 dígitos.
 * Retorna null se o prefixo não for reconhecido.
 */
export function resolveZoneByZipPrefix(cleanZip: string): number | null {
  const prefix = cleanZip.slice(0, 5);
  return ZIP_PREFIX_ZONE_MAP[prefix] ?? null;
}

/**
 * Consulta o ViaCEP para obter bairro, cidade, estado e logradouro de um CEP.
 * Retorna null em caso de falha ou CEP inexistente.
 */
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
      next: { revalidate: 86400 }, // Cache do Next.js por 24h
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

/**
 * Resolve qual zona de entrega (1–4) corresponde a um CEP de Feira de Santana.
 *
 * Não usa GPS, distância ou qualquer API paga.
 * Estratégia:
 *   1. ViaCEP → bairro → tabela BAIRRO→ZONA
 *   2. Fallback: prefixo CEP → tabela PREFIX→ZONA
 *   3. Fallback final: Zona 1 (mais central, mais segura para o cliente)
 *
 * @param cleanZip   CEP normalizado (8 dígitos, sem hífen)
 * @returns          Número de ordem da zona (1–4), dados de endereço e fonte usada
 */
export async function resolveZoneOrder(cleanZip: string): Promise<ZoneLookupResult> {
  let district = "";
  let city = STORE_SHIPPING_CONFIG.storeCity;
  let state = STORE_SHIPPING_CONFIG.storeState;
  let street = "";

  // ── Camada 1: ViaCEP ───────────────────────────────────────────────────────
  const viaCepData = await fetchViaCep(cleanZip);

  if (viaCepData) {
    district = viaCepData.district;
    city = viaCepData.city || city;
    state = viaCepData.state || state;
    street = viaCepData.street;

    // ── Camada 2: Bairro → Zona ─────────────────────────────────────────────
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

  // ── Camada 3: Prefixo do CEP → Zona ───────────────────────────────────────
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

  // ── Camada 4: Fallback padrão (Zona 1) ────────────────────────────────────
  return {
    zoneOrder: 1,
    district: district || "Feira de Santana",
    city,
    state,
    street,
    source: "default_fallback",
  };
}
