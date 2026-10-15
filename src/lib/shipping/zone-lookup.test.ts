/**
 * zone-lookup.test.ts
 *
 * Testes unitários para o sistema de resolução de zona de entrega.
 * Cobre os cenários especificados no plano de implementação e na revisão técnica.
 *
 * Para rodar: npm test
 */

import {
  normalizeKey,
  isRuralDistrict,
  resolveZoneByZipPrefix,
  resolveZone,
  fetchAddressData,
  OUT_OF_AREA_PREFIXES,
  RURAL_DISTRICT_EXACT_KEYS,
  NEIGHBORHOOD_ZONE_MAP,
  ZIP_PREFIX_ZONE_MAP,
} from "./zone-lookup";
import prisma from "@/lib/prisma";
import feiraCepsRaw from "./data/feira-ceps.json";

const LOCAL_FEIRA_CEPS: Record<string, { district: string; street?: string }> =
  feiraCepsRaw as Record<string, { district: string; street?: string }>;

// ─── normalizeKey ─────────────────────────────────────────────────────────────

describe("normalizeKey", () => {
  it("remove acentos e converte para lowercase", () => {
    expect(normalizeKey("Olhos D'Água")).toBe("olhosdagua");
    expect(normalizeKey("Subaé (Tanquinho)")).toBe("subaetanquinho");
    expect(normalizeKey("35º BI")).toBe("35bi");
    expect(normalizeKey("Santo Antônio dos Prazeres")).toBe("santoantoniodosprazeres");
    expect(normalizeKey("São João")).toBe("saojoao");
  });

  it("remove espaços e caracteres especiais", () => {
    expect(normalizeKey("  Centro  ")).toBe("centro");
    expect(normalizeKey("Campo Limpo")).toBe("campolimpo");
    expect(normalizeKey("CIS Norte")).toBe("cisnorte");
  });
});

// ─── isRuralDistrict ──────────────────────────────────────────────────────────

describe("isRuralDistrict", () => {
  it("identifica corretamente distritos rurais confirmados", () => {
    expect(isRuralDistrict("Humildes")).toBe(true);
    expect(isRuralDistrict("Mantiba")).toBe(true);
    expect(isRuralDistrict("Pedra Ferrada")).toBe(true);
    expect(isRuralDistrict("Limoeiro")).toBe(true);
    expect(isRuralDistrict("Tanquinho")).toBe(true); // alias de Subaé (Tanquinho)
  });

  it("NÃO bloqueia o bairro urbano Subaé", () => {
    expect(isRuralDistrict("Subaé")).toBe(false);
    expect(isRuralDistrict("subae")).toBe(false);
  });

  it("NÃO bloqueia bairros urbanos legítimos", () => {
    expect(isRuralDistrict("Centro")).toBe(false);
    expect(isRuralDistrict("Tomba")).toBe(false);
    expect(isRuralDistrict("SIM")).toBe(false);
    expect(isRuralDistrict("Capuchinhos")).toBe(false);
    expect(isRuralDistrict("Olhos D'Água")).toBe(false);
  });
});

// ─── RURAL_DISTRICT_EXACT_KEYS — matching exato, sem includes() ───────────────

describe("RURAL_DISTRICT_EXACT_KEYS — matching exato, sem includes()", () => {
  it("não tem 'subae' (bairro urbano Subaé NÃO está bloqueado)", () => {
    expect(RURAL_DISTRICT_EXACT_KEYS.has("subae")).toBe(false);
  });

  it("tem 'subaetanquinho' (distrito rural confirmado)", () => {
    expect(RURAL_DISTRICT_EXACT_KEYS.has("subaetanquinho")).toBe(true);
  });

  it("tem 'tanquinho' (alias do Subaé Tanquinho)", () => {
    expect(RURAL_DISTRICT_EXACT_KEYS.has("tanquinho")).toBe(true);
  });

  it("tem 'pedraferrada' e 'limoeiro'", () => {
    expect(RURAL_DISTRICT_EXACT_KEYS.has("pedraferrada")).toBe(true);
    expect(RURAL_DISTRICT_EXACT_KEYS.has("limoeiro")).toBe(true);
  });

  it("tem 'humildes' e 'mantiba'", () => {
    expect(RURAL_DISTRICT_EXACT_KEYS.has("humildes")).toBe(true);
    expect(RURAL_DISTRICT_EXACT_KEYS.has("mantiba")).toBe(true);
  });
});

// ─── OUT_OF_AREA_PREFIXES gerado a partir do JSON (100% pureza rural) ─────────

describe("OUT_OF_AREA_PREFIXES (derivado em tempo de carga)", () => {
  it("inclui prefixos rurais puros confirmados", () => {
    expect(OUT_OF_AREA_PREFIXES.has("44099")).toBe(true); // Humildes
    expect(OUT_OF_AREA_PREFIXES.has("44039")).toBe(true); // Mantiba
    expect(OUT_OF_AREA_PREFIXES.has("44037")).toBe(true); // Pedra Ferrada
    expect(OUT_OF_AREA_PREFIXES.has("44038")).toBe(true); // Pedra Ferrada
    expect(OUT_OF_AREA_PREFIXES.has("44097")).toBe(true); // Limoeiro
    expect(OUT_OF_AREA_PREFIXES.has("44098")).toBe(true); // Limoeiro
  });

  it("NÃO inclui prefixos não verificáveis 44100-44149 (removidos para seguir a cascata)", () => {
    expect(OUT_OF_AREA_PREFIXES.has("44100")).toBe(false);
    expect(OUT_OF_AREA_PREFIXES.has("44110")).toBe(false);
    expect(OUT_OF_AREA_PREFIXES.has("44120")).toBe(false);
    expect(OUT_OF_AREA_PREFIXES.has("44135")).toBe(false);
    expect(OUT_OF_AREA_PREFIXES.has("44149")).toBe(false);
  });

  it("NÃO inclui o prefixo 44080 (misto: Subaé urbano + Subaé Tanquinho)", () => {
    expect(OUT_OF_AREA_PREFIXES.has("44080")).toBe(false);
  });

  it("NÃO inclui prefixos urbanos de Feira", () => {
    expect(OUT_OF_AREA_PREFIXES.has("44001")).toBe(false);
    expect(OUT_OF_AREA_PREFIXES.has("44063")).toBe(false);
    expect(OUT_OF_AREA_PREFIXES.has("44079")).toBe(false);
    expect(OUT_OF_AREA_PREFIXES.has("44085")).toBe(false);
  });
});

// ─── NEIGHBORHOOD_ZONE_MAP (mapa estático) ────────────────────────────────────

describe("NEIGHBORHOOD_ZONE_MAP (estático)", () => {
  it("Zona 1: Centro e imediações, incluindo Calumbi", () => {
    expect(NEIGHBORHOOD_ZONE_MAP["centro"]).toBe(1);
    expect(NEIGHBORHOOD_ZONE_MAP["queimadinha"]).toBe(1);
    expect(NEIGHBORHOOD_ZONE_MAP["capuchinhos"]).toBe(1);
    expect(NEIGHBORHOOD_ZONE_MAP["olhosdagua"]).toBe(1);
    expect(NEIGHBORHOOD_ZONE_MAP["lagoagrande"]).toBe(1);
    expect(NEIGHBORHOOD_ZONE_MAP["muchila"]).toBe(1);
    expect(NEIGHBORHOOD_ZONE_MAP["calumbi"]).toBe(1); // Calumbi = Z1
  });

  it("Zona 2: intermediários, incluindo Campo Limpo (atualizado de Z3 para Z2)", () => {
    expect(NEIGHBORHOOD_ZONE_MAP["tomba"]).toBe(2);
    expect(NEIGHBORHOOD_ZONE_MAP["sim"]).toBe(2);
    expect(NEIGHBORHOOD_ZONE_MAP["sobradinho"]).toBe(2);
    expect(NEIGHBORHOOD_ZONE_MAP["caseb"]).toBe(2);
    expect(NEIGHBORHOOD_ZONE_MAP["subae"]).toBe(2); // Subaé urbano → Z2
    expect(NEIGHBORHOOD_ZONE_MAP["brasilia"]).toBe(2);
    expect(NEIGHBORHOOD_ZONE_MAP["gabriela"]).toBe(2);
    expect(NEIGHBORHOOD_ZONE_MAP["campolimpo"]).toBe(2); // Campo Limpo = Z2
  });

  it("Zona 3: bairros perimetrais", () => {
    expect(NEIGHBORHOOD_ZONE_MAP["aviario"]).toBe(3);
    expect(NEIGHBORHOOD_ZONE_MAP["cis"]).toBe(3); // CIS urbano → Z3
    expect(NEIGHBORHOOD_ZONE_MAP["conjuntofraternidade"]).toBe(3);
    expect(NEIGHBORHOOD_ZONE_MAP["papagaio"]).toBe(3);
    expect(NEIGHBORHOOD_ZONE_MAP["mangabeira"]).toBe(3);
  });

  it("Zona 4: bairros mais distantes", () => {
    expect(NEIGHBORHOOD_ZONE_MAP["cisnorte"]).toBe(4);
    expect(NEIGHBORHOOD_ZONE_MAP["registro"]).toBe(4);
    expect(NEIGHBORHOOD_ZONE_MAP["aeroporto"]).toBe(4);
  });
});

// ─── ZIP_PREFIX_ZONE_MAP gerado ───────────────────────────────────────────────

describe("ZIP_PREFIX_ZONE_MAP (gerado dinamicamente)", () => {
  it("CIS urbano (44010xxx) → Zona 3", () => {
    expect(ZIP_PREFIX_ZONE_MAP["44010"]).toBe(3);
  });

  it("CIS Norte (44063xxx) → Zona 4", () => {
    expect(ZIP_PREFIX_ZONE_MAP["44063"]).toBe(4);
  });

  it("Subaé urbano (44079xxx) → Zona 2 (não bloqueado)", () => {
    expect(ZIP_PREFIX_ZONE_MAP["44079"]).toBe(2);
  });

  it("Conjunto Fraternidade (44068xxx) → Zona 3", () => {
    expect(ZIP_PREFIX_ZONE_MAP["44068"]).toBe(3);
  });

  it("Centro (44001, 44002) → Zona 1", () => {
    expect(ZIP_PREFIX_ZONE_MAP["44001"]).toBe(1);
    expect(ZIP_PREFIX_ZONE_MAP["44002"]).toBe(1);
  });

  it("prefixos mistos (44080, 44052, 44076) NÃO estão no mapa gerado", () => {
    expect(ZIP_PREFIX_ZONE_MAP["44080"]).toBeUndefined();
    expect(ZIP_PREFIX_ZONE_MAP["44052"]).toBeUndefined();
    expect(ZIP_PREFIX_ZONE_MAP["44076"]).toBeUndefined();
  });

  it("44097, 44098, 44099 OMITIDOS (estão em OUT_OF_AREA_PREFIXES)", () => {
    expect(ZIP_PREFIX_ZONE_MAP["44097"]).toBeUndefined();
    expect(ZIP_PREFIX_ZONE_MAP["44098"]).toBeUndefined();
    expect(ZIP_PREFIX_ZONE_MAP["44099"]).toBeUndefined();
  });
});

// ─── resolveZoneByZipPrefix ───────────────────────────────────────────────────

describe("resolveZoneByZipPrefix", () => {
  it("CIS (44010xxx) → 3", () => {
    expect(resolveZoneByZipPrefix("44010123")).toBe(3);
  });

  it("CIS Norte (44063000) → 4", () => {
    expect(resolveZoneByZipPrefix("44063000")).toBe(4);
  });

  it("Subaé urbano (44079xxx) → 2 (não bloqueia)", () => {
    expect(resolveZoneByZipPrefix("44079001")).toBe(2);
  });

  it("44080xxx → null (prefixo misto, omitido do mapa)", () => {
    expect(resolveZoneByZipPrefix("44080853")).toBeNull();
  });

  it("CEP de outra cidade → null", () => {
    expect(resolveZoneByZipPrefix("01001000")).toBeNull();
  });
});

// ─── Testes Obrigatórios da Revisão ───────────────────────────────────────────

describe("Testes de Validação e Consistência (Revisão Técnica)", () => {
  it("Para TODO CEP de feira-ceps.json: a zona pelo prefixo (se presente) é igual à zona pelo bairro", () => {
    for (const [zip, entry] of Object.entries(LOCAL_FEIRA_CEPS)) {
      const prefix5 = zip.slice(0, 5);
      const prefixZone = ZIP_PREFIX_ZONE_MAP[prefix5];
      if (prefixZone !== undefined) {
        const key = normalizeKey(entry.district);
        const neighborhoodZone = NEIGHBORHOOD_ZONE_MAP[key];
        expect(neighborhoodZone).toBeDefined();
        expect(prefixZone).toBe(neighborhoodZone);
      }
    }
  });

  it("Todo bairro distinto de feira-ceps.json existe mapeado (zona ou outOfArea)", () => {
    const distinctDistricts = new Set(
      Object.values(LOCAL_FEIRA_CEPS)
        .map((e) => e.district?.trim())
        .filter(Boolean)
    );
    expect(distinctDistricts.size).toBe(53);

    for (const district of distinctDistricts) {
      const key = normalizeKey(district);
      const isRural = RURAL_DISTRICT_EXACT_KEYS.has(key);
      const zone = NEIGHBORHOOD_ZONE_MAP[key];
      const isClassified = isRural || zone !== undefined;
      expect({ district, isClassified }).toEqual({ district, isClassified: true });
    }
  });
});

// ─── Teste de fetchAddressData com Promise.any ────────────────────────────────

describe("fetchAddressData com Promise.any", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("ViaCEP lenta + BrasilAPI rápida: retorna sem esperar a lenta", async () => {
    global.fetch = jest.fn((url: RequestInfo | URL) => {
      const urlStr = url.toString();
      if (urlStr.includes("viacep.com.br")) {
        // Simula ViaCEP respondendo lentamente (800ms)
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({
                localidade: "Feira de Santana",
                bairro: "Centro",
                uf: "BA",
                logradouro: "Rua A",
              }),
            } as unknown as Response);
          }, 800);
        });
      }
      if (urlStr.includes("brasilapi.com.br")) {
        // Simula BrasilAPI respondendo rapidamente (15ms)
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({
                city: "Feira de Santana",
                neighborhood: "Centro",
                state: "BA",
                street: "Rua A",
              }),
            } as unknown as Response);
          }, 15);
        });
      }
      return Promise.reject(new Error("Unknown URL"));
    }) as unknown as typeof fetch;

    const start = Date.now();
    const result = await fetchAddressData("44001000");
    const duration = Date.now() - start;

    expect(result).not.toBeNull();
    expect(result?.source).toBe("brasilapi");
    expect(duration).toBeLessThan(400); // Retornou rápido sem esperar os 800ms da ViaCEP!
  });
});

// ─── Teste de interpolação por vizinho numérico ordenado ───────────────────────

describe("Interpolação de vizinhos por array ordenado (Passo 5)", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    // Simula que APIs externas falharam para acionar o Passo 5
    global.fetch = jest.fn(() => Promise.reject(new Error("API offline"))) as unknown as typeof fetch;
    // Garante que o banco remoto não interfira com cache gravado
    jest.spyOn(prisma.shippingZipCode, "findUnique").mockResolvedValue(null as never);
    jest.spyOn(prisma.shippingZipOverride, "findUnique").mockResolvedValue(null as never);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("CEP entre dois do mesmo bairro com gap <= 60 resolve via interpolação", async () => {
    // 44052006 está no prefixo misto 44052 (sem zona por prefixo)
    // Vizinhos no JSON: 44052005 (CASEB) e 44052008 (CASEB), ambos no mesmo bairro e gap <= 60
    const result = await resolveZone("44052006");
    expect(result.source).toBe("neighbor_interp");
    expect(result.district).toBe("CASEB");
    expect(result.zoneOrder).toBe(2);
  });

  it("CEP entre bairros diferentes NÃO resolve por interpolação (cai em needs_neighborhood)", async () => {
    // 44052200 está no prefixo misto 44052
    // Vizinhos no JSON: 44052182 (CASEB) e 44052316 (Lagoa Grande) -> bairros diferentes
    const result = await resolveZone("44052200");
    expect(result.source).toBe("needs_neighborhood");
    expect(result.needsNeighborhoodSelection).toBe(true);
    expect(result.zoneOrder).toBeNull();
  });

  it("CEP com distância superior a 60 NÃO resolve por interpolação", async () => {
    // 44001810: vizinhos 44001800 e 44001900, distância para o posterior é 90 (> 60)
    // Como 44001810 não tem vizinho <= 60 em ambos os lados, interpolação não resolve.
    // Como 44001 é prefixo puro Zona 1, o Passo 6 resolverá por zip_prefix (e não neighbor_interp)
    const result = await resolveZone("44001810");
    expect(result.source).not.toBe("neighbor_interp");
  });
});
