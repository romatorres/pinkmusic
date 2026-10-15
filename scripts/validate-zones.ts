/**
 * scripts/validate-zones.ts  (v2)
 *
 * Ferramenta de REVISÃO (não roda em produção, não altera banco).
 * Estima a distância de cada bairro até a loja e sugere a zona, com checagens
 * para detectar erros do geocodificador.
 *
 * Diferenças da v1:
 *  - Geocodifica RUAS de amostra (3-5 CEPs por bairro) em vez do nome do bairro.
 *  - Restringe a busca a uma caixa geográfica do município (viewbox + bounded).
 *  - Usa a MEDIANA dos pontos e descarta outliers.
 *  - Marca confiança (alta/média/baixa) e se o bairro cruza fronteira de zona.
 *  - Compara cada bairro com os vizinhos por CEP (CEPs sequenciais = região próxima).
 *  - Aceita coordenadas manuais (Google Maps) para os casos que o Nominatim erra.
 *
 * Uso:
 *   npx tsx scripts/validate-zones.ts
 *   npx tsx scripts/validate-zones.ts --samples=5 --verbose
 *   npx tsx scripts/validate-zones.ts --retry-failed        (refaz consultas que falharam)
 *   npx tsx scripts/validate-zones.ts --cep-file=src/lib/shipping/data/feira-ceps.json
 *
 * Variáveis de ambiente:
 *   NOMINATIM_EMAIL  seu e-mail (a política do Nominatim pede identificação)
 *
 * Arquivos opcionais:
 *   scripts/manual-coords.json   { "Olhos D'Água": { "lat": -12.25, "lon": -38.96, "note": "Google Maps" } }
 *   scripts/zones-current.json   { "centro": 1, "tomba": 2 }   (zona atual por chave normalizada)
 *                                (se ausente, tenta importar NEIGHBORHOOD_ZONE_MAP do zone-lookup.ts)
 *
 * Saídas: tabela no console + scripts/zone-report.csv + scripts/zone-report.json
 */

import fs from "node:fs";
import path from "node:path";

// ───────────────────────────── CONFIGURAÇÃO ─────────────────────────────────

const STORE = { name: "Pink Music (Centro / Rua JJ Seabra)", lat: -12.2576, lon: -38.9634 };

/** Fator para aproximar a rota viária a partir da linha reta. */
const ROUTE_FACTOR = 1.3;

/** Limites das zonas em km (inclusivo). */
const ZONE_LIMITS = [3, 6, 10, 12];

/**
 * Caixa geográfica generosa do município de Feira de Santana.
 * Pontos fora dela são descartados (geocodificador achou outro lugar).
 * Ajuste se necessário.
 */
const BBOX = { latMin: -12.5, latMax: -11.95, lonMin: -39.3, lonMax: -38.7 };

/** Distritos rurais confirmados (bloqueio independe da distância estimada). */
const CONFIRMED_RURAL_KEYS = new Set(["humildes", "mantiba", "subaetanquinho", "tanquinho"]);

/** Parâmetros de qualidade. */
const OUTLIER_KM = 4; // ponto a mais de 4 km da mediana é descartado (com 3+ pontos)
const SPREAD_HIGH_KM = 3; // dispersão máxima para confiança alta
const SPREAD_MED_KM = 5; // dispersão máxima para confiança média
const NEIGHBOR_DIFF_KM = 6; // diferença para vizinhos que dispara alerta de coerência
const REQUEST_DELAY_MS = 1100; // Nominatim: máx. 1 req/s

// ───────────────────────────── ARGUMENTOS ───────────────────────────────────

const args = process.argv.slice(2);
const argVal = (name: string, def: string) => {
  const a = args.find((x) => x.startsWith(`--${name}=`));
  return a ? a.split("=").slice(1).join("=") : def;
};
const hasFlag = (name: string) => args.includes(`--${name}`);

const SAMPLES = Math.max(1, parseInt(argVal("samples", "4"), 10) || 4);
const CEP_FILE = argVal("cep-file", "src/lib/shipping/data/feira-ceps.json");
const RETRY_FAILED = hasFlag("retry-failed");
const VERBOSE = hasFlag("verbose");
const EMAIL = process.env.NOMINATIM_EMAIL || "contato@pinkmusic.com.br";

const SCRIPTS_DIR = path.resolve(process.cwd(), "scripts");
const CACHE_FILE = path.join(SCRIPTS_DIR, ".geocode-cache-v2.json");
const MANUAL_FILE = path.join(SCRIPTS_DIR, "manual-coords.json");
const ZONES_FILE = path.join(SCRIPTS_DIR, "zones-current.json");

// ───────────────────────────── TIPOS ────────────────────────────────────────

type CepEntry = { district: string; street?: string };
type Coord = { lat: number; lon: number };
type Confidence = "alta" | "media" | "baixa" | "nenhuma";

interface Sample {
  cep: string;
  street: string;
  query: string;
  coord: Coord | null;
  kind: "street" | "street-nodistrict" | "district" | "manual";
}

interface DistrictResult {
  district: string;
  key: string;
  ceps: number;
  minCep: string;
  maxCep: string;
  pointsUsed: number;
  pointsTried: number;
  centroid: Coord | null;
  kmMedian: number | null;
  kmMin: number | null;
  kmMax: number | null;
  spreadKm: number | null;
  confidence: Confidence;
  suggestedZone: number | null; // 1-4, 0 = fora (>12 km), null = sem estimativa
  currentZone: number | null;
  blocked: boolean;
  crossesBoundary: boolean;
  neighbors: string[];
  neighborKmMedian: number | null;
  alerts: string[];
  manual: boolean;
}

// ───────────────────────────── UTILITÁRIOS ──────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function normalizeKey(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function haversineKm(a: Coord, b: Coord): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const routeKm = (c: Coord) => haversineKm(STORE, c) * ROUTE_FACTOR;

function zoneForKm(km: number): number {
  for (let i = 0; i < ZONE_LIMITS.length; i++) if (km <= ZONE_LIMITS[i]) return i + 1;
  return 0; // fora
}

const zoneLabel = (z: number | null): string => {
  if (z === null) return "—";
  if (z === 0) return "FORA (>12km)";
  return `Z${z} (${z === 1 ? "0-3" : z === 2 ? "3-6" : z === 3 ? "6-10" : "10-12"}km)`;
};

const inBbox = (c: Coord) =>
  c.lat >= BBOX.latMin && c.lat <= BBOX.latMax && c.lon >= BBOX.lonMin && c.lon <= BBOX.lonMax;

function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

// ───────────────────────────── GEOCODIFICAÇÃO ───────────────────────────────

type CacheValue = { lat: number; lon: number; display?: string } | null;
const cache: Record<string, CacheValue> = readJson(CACHE_FILE, {});
let cacheDirty = false;
let lastRequestAt = 0;

function saveCache() {
  if (!cacheDirty) return;
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
  cacheDirty = false;
}

async function geocode(query: string): Promise<Coord | null> {
  if (query in cache && !(RETRY_FAILED && cache[query] === null)) {
    const c = cache[query];
    return c ? { lat: c.lat, lon: c.lon } : null;
  }

  const wait = REQUEST_DELAY_MS - (Date.now() - lastRequestAt);
  if (wait > 0) await sleep(wait);

  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    limit: "1",
    countrycodes: "br",
    viewbox: `${BBOX.lonMin},${BBOX.latMax},${BBOX.lonMax},${BBOX.latMin}`,
    bounded: "1",
    email: EMAIL,
  });

  try {
    lastRequestAt = Date.now();
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { "User-Agent": `validate-zones/2.0 (${EMAIL})`, "Accept-Language": "pt-BR" },
    });
    if (!res.ok) {
      console.warn(`  ! HTTP ${res.status} para "${query}" (não cacheado)`);
      return null;
    }
    const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    if (!data.length) {
      cache[query] = null;
      cacheDirty = true;
      return null;
    }
    const coord = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    cache[query] = { ...coord, display: data[0].display_name };
    cacheDirty = true;
    return coord;
  } catch (e) {
    console.warn(`  ! Falha de rede em "${query}": ${(e as Error).message} (não cacheado)`);
    return null;
  }
}

// ───────────────────────────── AMOSTRAGEM ───────────────────────────────────

/** Ruas genéricas ("Rua A", "Rua 7", "Rua Um", "Alameda B") geocodificam mal. */
const GENERIC_STREET =
  /^(\d+ª\s+)?(rua|travessa|alameda|avenida|vila|praça|caminho)\s+([a-z]|[a-z]-?\d*|\d+|[ivx]+|um|dois|tres|três|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|quinze|vinte)(\s|$)/i;
/** Estradas/rodovias se estendem por muitos km e distorcem o centroide. */
const LONG_ROAD = /^(estrada|rodovia|corredor|ramal|comunidade urbana)/i;

function pickSamples(entries: Array<[string, CepEntry]>, n: number): Array<[string, CepEntry]> {
  const sorted = [...entries].sort((a, b) => a[0].localeCompare(b[0]));
  const seenStreets = new Set<string>();
  const good: Array<[string, CepEntry]> = [];
  for (const e of sorted) {
    const street = (e[1].street || "").trim();
    if (!street || GENERIC_STREET.test(street) || LONG_ROAD.test(street)) continue;
    const k = normalizeKey(street);
    if (seenStreets.has(k)) continue;
    seenStreets.add(k);
    good.push(e);
  }
  const pool = good.length >= 2 ? good : sorted.filter((e) => !LONG_ROAD.test(e[1].street || ""));
  const base = pool.length ? pool : sorted;
  if (base.length <= n) return base;
  // índices espalhados ao longo da faixa de CEPs do bairro
  const picked: Array<[string, CepEntry]> = [];
  for (let i = 0; i < n; i++) picked.push(base[Math.round((i * (base.length - 1)) / (n - 1 || 1))]);
  return Array.from(new Set(picked));
}

async function collectSamples(
  district: string,
  entries: Array<[string, CepEntry]>
): Promise<Sample[]> {
  const out: Sample[] = [];
  for (const [cep, e] of pickSamples(entries, SAMPLES)) {
    const street = (e.street || "").trim();
    const q1 = `${street}, ${district}, Feira de Santana, Bahia, Brasil`;
    let coord = await geocode(q1);
    let kind: Sample["kind"] = "street";
    let query = q1;
    if (!coord) {
      const q2 = `${street}, Feira de Santana, Bahia, Brasil`;
      coord = await geocode(q2);
      kind = "street-nodistrict";
      query = q2;
    }
    out.push({ cep, street, query, coord, kind });
  }
  return out;
}

// ───────────────────────────── ANÁLISE ──────────────────────────────────────

function analyzeSamples(samples: Sample[]) {
  let pts = samples.filter((s) => s.coord && inBbox(s.coord!)).map((s) => s.coord!);
  const tried = samples.length;

  // descarta outliers em relação à mediana (precisa de 3+ pontos)
  if (pts.length >= 3) {
    const med: Coord = { lat: median(pts.map((p) => p.lat)), lon: median(pts.map((p) => p.lon)) };
    const filtered = pts.filter((p) => haversineKm(p, med) <= OUTLIER_KM);
    if (filtered.length >= 2) pts = filtered;
  }
  if (!pts.length) return { pts, tried, centroid: null as Coord | null };

  const centroid: Coord = { lat: median(pts.map((p) => p.lat)), lon: median(pts.map((p) => p.lon)) };
  return { pts, tried, centroid };
}

function confidenceOf(n: number, spread: number | null, manual: boolean): Confidence {
  if (manual) return "alta";
  if (n === 0 || spread === null) return "nenhuma";
  if (n >= 3 && spread <= SPREAD_HIGH_KM) return "alta";
  if (n >= 2 && spread <= SPREAD_MED_KM) return "media";
  return "baixa";
}

/** Vizinhos por CEP: bairros que aparecem logo antes/depois nas sequências de CEP. */
function neighborMap(sortedAll: Array<[string, CepEntry]>): Map<string, Set<string>> {
  const runs: string[] = []; // bairro de cada "sequência contínua"
  for (const [, e] of sortedAll) {
    if (runs[runs.length - 1] !== e.district) runs.push(e.district);
  }
  const map = new Map<string, Set<string>>();
  const add = (a: string, b: string) => {
    if (a === b) return;
    if (!map.has(a)) map.set(a, new Set());
    map.get(a)!.add(b);
  };
  for (let i = 0; i < runs.length; i++) {
    if (i > 0) add(runs[i], runs[i - 1]);
    if (i < runs.length - 1) add(runs[i], runs[i + 1]);
  }
  return map;
}

// ───────────────────────────── PRINCIPAL ────────────────────────────────────

async function loadCurrentZones(): Promise<Record<string, number>> {
  const fromFile = readJson<Record<string, number> | null>(ZONES_FILE, null);
  if (fromFile) return fromFile;
  try {
    // tenta reaproveitar o mapa atual do projeto em src/lib/shipping/zone-lookup
    const mod: any = await import("../src/lib/shipping/zone-lookup");
    if (mod?.NEIGHBORHOOD_ZONE_MAP) return mod.NEIGHBORHOOD_ZONE_MAP as Record<string, number>;
  } catch {
    /* segue sem zona atual */
  }
  console.warn(
    "Aviso: não consegui ler as zonas atuais (crie scripts/zones-current.json ou ajuste o import). " +
      'A coluna "ATUAL" ficará vazia.\n'
  );
  return {};
}

async function main() {
  const cepPath = path.resolve(process.cwd(), CEP_FILE);
  const ceps = readJson<Record<string, CepEntry>>(cepPath, {});
  const cepEntries = Object.entries(ceps);
  if (!cepEntries.length) {
    console.error(`Não encontrei CEPs em ${cepPath}. Use --cep-file=caminho.`);
    process.exit(1);
  }

  const manual = readJson<Record<string, { lat: number; lon: number; note?: string }>>(MANUAL_FILE, {});
  const manualByKey = new Map(Object.entries(manual).map(([k, v]) => [normalizeKey(k), v]));
  const currentZones = await loadCurrentZones();

  const sortedAll = [...cepEntries].sort((a, b) => a[0].localeCompare(b[0]));
  const byDistrict = new Map<string, Array<[string, CepEntry]>>();
  for (const e of sortedAll) {
    if (!byDistrict.has(e[1].district)) byDistrict.set(e[1].district, []);
    byDistrict.get(e[1].district)!.push(e);
  }
  const neighbors = neighborMap(sortedAll);

  console.log("=".repeat(100));
  console.log(` VALIDAÇÃO DE ZONAS v2 — origem: ${STORE.name} (${STORE.lat}, ${STORE.lon})`);
  console.log(` Fator de rota: ${ROUTE_FACTOR}x | amostras por bairro: ${SAMPLES} | bbox do município ativa`);
  console.log("=".repeat(100));
  console.log(`${cepEntries.length} CEPs em ${byDistrict.size} bairros. Geocodificando (≈1 req/s, cache em disco)...\n`);

  const results: DistrictResult[] = [];
  const debugSamples = new Map<string, Sample[]>();
  let i = 0;

  for (const [district, entries] of byDistrict) {
    i++;
    const key = normalizeKey(district);
    process.stdout.write(`[${i}/${byDistrict.size}] ${district}... `);

    let samples: Sample[] = [];
    let pts: Coord[] = [];
    let tried = 0;
    let centroid: Coord | null = null;
    const isManual = manualByKey.has(key);

    if (isManual) {
      const m = manualByKey.get(key)!;
      centroid = { lat: m.lat, lon: m.lon };
      pts = [centroid];
      tried = 1;
      samples = [{ cep: "-", street: m.note || "manual", query: "manual", coord: centroid, kind: "manual" }];
    } else {
      samples = await collectSamples(district, entries);
      ({ pts, tried, centroid } = analyzeSamples(samples));

      // Último recurso: ponto do bairro (menos confiável; sempre sinalizado)
      if (!pts.length) {
        const q = `${district}, Feira de Santana, Bahia, Brasil`;
        const c = await geocode(q);
        samples.push({ cep: "-", street: "(centro do bairro)", query: q, coord: c, kind: "district" });
        if (c && inBbox(c)) {
          pts = [c];
          centroid = c;
          tried += 1;
        }
      }
    }
    debugSamples.set(district, samples);
    saveCache();

    const kms = pts.map(routeKm);
    const spread =
      centroid && pts.length ? Math.max(...pts.map((p) => haversineKm(p, centroid!))) : null;
    const usedDistrictFallback = samples.some((s) => s.kind === "district" && s.coord && inBbox(s.coord));
    let confidence = confidenceOf(pts.length, spread, isManual);
    if (usedDistrictFallback && !isManual) confidence = "baixa";

    const kmMedian = centroid ? routeKm(centroid) : null;
    const kmMin = kms.length ? Math.min(...kms) : null;
    const kmMax = kms.length ? Math.max(...kms) : null;
    const suggested = kmMedian === null ? null : zoneForKm(kmMedian);
    const crossesBoundary =
      kmMin !== null && kmMax !== null && zoneForKm(kmMin) !== zoneForKm(kmMax);

    const ceplist = entries.map((e) => e[0]);
    results.push({
      district,
      key,
      ceps: entries.length,
      minCep: ceplist[0],
      maxCep: ceplist[ceplist.length - 1],
      pointsUsed: pts.length,
      pointsTried: tried,
      centroid,
      kmMedian,
      kmMin,
      kmMax,
      spreadKm: spread,
      confidence,
      suggestedZone: suggested,
      currentZone: currentZones[key] ?? null,
      blocked: CONFIRMED_RURAL_KEYS.has(key),
      crossesBoundary,
      neighbors: [...(neighbors.get(district) ?? [])],
      neighborKmMedian: null,
      alerts: [],
      manual: isManual,
    });
    console.log(kmMedian === null ? "sem geocode" : `${kmMedian.toFixed(1)} km (${pts.length}/${tried} pts)`);
  }

  // ── Coerência com vizinhos ──
  const byName = new Map(results.map((r) => [r.district, r]));
  for (const r of results) {
    const reliable = r.neighbors
      .map((n) => byName.get(n))
      .filter((n): n is DistrictResult => !!n && n.kmMedian !== null && (n.confidence === "alta" || n.confidence === "media"));
    if (reliable.length) r.neighborKmMedian = median(reliable.map((n) => n.kmMedian!));
    if (r.kmMedian !== null && reliable.length && !r.manual) {
      const allFar = reliable.every((n) => Math.abs(n.kmMedian! - r.kmMedian!) > NEIGHBOR_DIFF_KM);
      if (allFar) {
        r.alerts.push(
          `INCOERENTE_VIZINHOS (vizinhos por CEP: ${reliable
            .map((n) => `${n.district} ${n.kmMedian!.toFixed(1)}km`)
            .join(", ")})`
        );
      }
    }
  }

  // ── Alertas gerais ──
  for (const r of results) {
    if (r.kmMedian === null) r.alerts.push("SEM_GEOCODE → defina em manual-coords.json");
    if (r.confidence === "baixa" && r.kmMedian !== null) r.alerts.push("BAIXA_CONFIANCA");
    if (r.crossesBoundary) r.alerts.push(`FRONTEIRA (${r.kmMin!.toFixed(1)}–${r.kmMax!.toFixed(1)} km cruza zonas)`);
    if (r.suggestedZone === 0 && !r.blocked) r.alerts.push(">12km SEM bloqueio");
    if (r.blocked && r.suggestedZone !== null && r.suggestedZone > 0)
      r.alerts.push("rural confirmado, mas estimativa <=12km (ok: regra de negócio)");
    if (r.currentZone === null && !r.blocked) r.alerts.push("SEM_ZONA atual");
    if (
      r.currentZone !== null &&
      r.suggestedZone !== null &&
      r.suggestedZone !== 0 &&
      r.currentZone !== r.suggestedZone &&
      r.confidence !== "baixa" &&
      r.confidence !== "nenhuma"
    )
      r.alerts.push(`ZONA_DIVERGENTE (Z${r.currentZone} → Z${r.suggestedZone})`);
  }

  // ── Calibração: o Centro deve ficar bem perto da loja ──
  const centro = results.find((r) => r.key === "centro");
  if (centro?.kmMedian != null && centro.kmMedian > 1.5) {
    console.log(
      `\n⚠ CALIBRAÇÃO: "Centro" deu ${centro.kmMedian.toFixed(1)} km (esperado < 1,5 km). ` +
        "O geocodificador pode estar impreciso; trate toda a tabela com cautela."
    );
  }

  // ── Tabela ──
  const sorted = [...results].sort((a, b) => a.district.localeCompare(b.district, "pt-BR"));
  const pad = (s: string, n: number) => (s.length >= n ? s.slice(0, n) : s + " ".repeat(n - s.length));
  console.log("\n" + "-".repeat(170));
  console.log(
    [
      pad("BAIRRO", 27),
      pad("CEPS", 5),
      pad("PTS", 5),
      pad("KM MED", 8),
      pad("FAIXA KM", 12),
      pad("ZONA SUGERIDA", 14),
      pad("ATUAL", 6),
      pad("CONF", 7),
      "ALERTAS",
    ].join(" | ")
  );
  console.log("-".repeat(170));
  for (const r of sorted) {
    const ok = r.confidence === "alta" || r.confidence === "media";
    const sugg = r.suggestedZone === null ? "REVISAR" : ok || r.manual ? zoneLabel(r.suggestedZone) : `? ${zoneLabel(r.suggestedZone)}`;
    console.log(
      [
        pad(r.district, 27),
        pad(String(r.ceps), 5),
        pad(`${r.pointsUsed}/${r.pointsTried}`, 5),
        pad(r.kmMedian === null ? "N/D" : r.kmMedian.toFixed(1), 8),
        pad(r.kmMin === null ? "—" : `${r.kmMin.toFixed(1)}-${r.kmMax!.toFixed(1)}`, 12),
        pad(sugg, 14),
        pad(r.currentZone === null ? (r.blocked ? "BLOQ" : "SEM") : `Z${r.currentZone}`, 6),
        pad(r.confidence, 7),
        r.alerts.join("; ") || "[ok]",
      ].join(" | ")
    );
    if (VERBOSE) {
      for (const s of debugSamples.get(r.district) ?? []) {
        const d = s.coord ? `${routeKm(s.coord).toFixed(1)}km${inBbox(s.coord) ? "" : " (fora da bbox)"}` : "falhou";
        console.log(`      · ${s.cep} ${s.street} [${s.kind}] → ${d}`);
      }
    }
  }
  console.log("-".repeat(170));

  // ── Sugestão por vizinhança para quem não geocodificou (INFERIDA) ──
  const noGeo = sorted.filter((r) => r.kmMedian === null);
  if (noGeo.length) {
    console.log("\nBairros sem geocode — referência por vizinhança de CEP (INFERIDA, só para orientar):");
    for (const r of noGeo) {
      console.log(
        `  - ${r.district}: vizinhos ${r.neighbors.join(", ") || "—"}` +
          (r.neighborKmMedian !== null ? ` (mediana dos vizinhos ≈ ${r.neighborKmMedian.toFixed(1)} km)` : "")
      );
    }
  }

  // ── Prefixos puros x mistos ──
  const prefixMap = new Map<string, Set<string>>();
  for (const [cep, e] of cepEntries) {
    const p = cep.slice(0, 5);
    if (!prefixMap.has(p)) prefixMap.set(p, new Set());
    prefixMap.get(p)!.add(e.district);
  }
  const mixed = [...prefixMap].filter(([, s]) => s.size > 1);
  console.log(`\nPrefixos de 5 dígitos: ${prefixMap.size - mixed.length} puros, ${mixed.length} mistos.`);
  for (const [p, s] of mixed) console.log(`  - ${p}*: ${[...s].join(", ")}`);

  // ── Resumo de ação ──
  const needManual = sorted.filter((r) => r.kmMedian === null || r.confidence === "baixa");
  const beyond = sorted.filter((r) => r.suggestedZone === 0 && !r.blocked && r.confidence !== "baixa" && r.confidence !== "nenhuma");
  const border = sorted.filter((r) => r.crossesBoundary || (r.kmMedian !== null && ZONE_LIMITS.some((l) => Math.abs(r.kmMedian! - l) <= 0.7)));
  console.log("\n" + "=".repeat(100));
  console.log(" O QUE FAZER AGORA");
  console.log("=".repeat(100));
  console.log(`1. Conferir no Google Maps (e colocar em scripts/manual-coords.json) — ${needManual.length} bairros:`);
  console.log(`   ${needManual.map((r) => r.district).join(", ") || "nenhum"}`);
  console.log(`2. Bairros >12 km COM confiança média/alta e sem bloqueio — ${beyond.length} (candidatos reais a outOfArea):`);
  console.log(`   ${beyond.map((r) => `${r.district} (${r.kmMedian!.toFixed(1)} km)`).join(", ") || "nenhum"}`);
  console.log(`3. Bairros em fronteira de zona (±0,7 km ou faixa cruza zonas) — ${border.length}; avaliar override por CEP:`);
  console.log(`   ${border.map((r) => r.district).join(", ") || "nenhum"}`);
  console.log("4. Só aplique zonas de bairros com confiança alta/média e sem alerta INCOERENTE_VIZINHOS.");

  // ── Exportar ──
  const csvHead = "bairro;ceps;cep_min;cep_max;pontos_usados;pontos_tentados;km_mediana;km_min;km_max;dispersao_km;confianca;zona_sugerida;zona_atual;bloqueado;manual;alertas";
  const csvRows = sorted.map((r) =>
    [
      r.district, r.ceps, r.minCep, r.maxCep, r.pointsUsed, r.pointsTried,
      r.kmMedian?.toFixed(2) ?? "", r.kmMin?.toFixed(2) ?? "", r.kmMax?.toFixed(2) ?? "",
      r.spreadKm?.toFixed(2) ?? "", r.confidence,
      r.suggestedZone === null ? "" : r.suggestedZone === 0 ? "FORA" : `Z${r.suggestedZone}`,
      r.currentZone === null ? "" : `Z${r.currentZone}`,
      r.blocked ? "SIM" : "NAO", r.manual ? "SIM" : "NAO",
      r.alerts.join(" | "),
    ].join(";")
  );
  fs.writeFileSync(path.join(SCRIPTS_DIR, "zone-report.csv"), "\uFEFF" + [csvHead, ...csvRows].join("\n"));
  fs.writeFileSync(path.join(SCRIPTS_DIR, "zone-report.json"), JSON.stringify(sorted, null, 2));
  saveCache();
  console.log("\nRelatórios salvos em scripts/zone-report.csv e scripts/zone-report.json");
}

main().catch((e) => {
  saveCache();
  console.error(e);
  process.exit(1);
});
