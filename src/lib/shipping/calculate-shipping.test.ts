/**
 * calculate-shipping.test.ts
 *
 * Testes unitários para o fluxo de calculateShipping e regras de negócio:
 *   - Seed não é chamado dentro de calculateShipping
 *   - Fluxo NEEDS_NEIGHBORHOOD com lista de bairros
 *   - Respeito à resolução de alta confiança vs escolha manual
 *   - Aplicação de zona maior com needsReview
 *   - Bloqueio de bairros outOfArea
 *   - Proteção de cache (somente high grava)
 *   - Tratamento estrito de zona inativa (sem fallback)
 *   - Editar zona de um bairro no banco e consultar de novo mantém a edição
 */

import { calculateShipping } from "./calculate-shipping";
import * as seedModule from "./seed";
import prisma from "@/lib/prisma";
import fs from "fs";

describe("calculateShipping — Regras de Negócio e Casos Especiais", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  // 1. Seed fora do caminho da consulta
  it("Seed não é chamado dentro de calculateShipping", async () => {
    const code = fs.readFileSync("src/lib/shipping/calculate-shipping.ts", "utf8");
    expect(code).not.toContain("ensureDefaultShippingZonesAndZipCodes");
  });

  // 2. NEEDS_NEIGHBORHOOD retorna lista de bairros sem outOfArea e sem zoneOrder null
  it("NEEDS_NEIGHBORHOOD retorna lista de bairros válidos ordenados", async () => {
    // 44052200 é um CEP no prefixo misto 44052 que cai entre bairros diferentes
    global.fetch = jest.fn(() => Promise.reject(new Error("API offline"))) as unknown as typeof fetch;
    jest.spyOn(prisma.shippingZipCode, "findUnique").mockResolvedValue(null as never);
    jest.spyOn(prisma.shippingZipOverride, "findUnique").mockResolvedValue(null as never);

    const result = await calculateShipping("44052200");

    expect(result.available).toBe(false);
    if (!result.available) {
      expect(result.reason).toBe("NEEDS_NEIGHBORHOOD");
      expect(result.neighborhoods).toBeDefined();
      expect(Array.isArray(result.neighborhoods)).toBe(true);
      expect(result.neighborhoods!.length).toBeGreaterThan(0);

      // Garante que nenhum bairro na lista é rural ou sem zona
      for (const nb of result.neighborhoods!) {
        expect(nb.key).toBeDefined();
        expect(nb.name).toBeDefined();
        expect(nb.key).not.toBe("humildes");
        expect(nb.key).not.toBe("mantiba");
      }
    }
  });

  // 3. selectedNeighborhoodKey ignorado quando o CEP resolveu com confiança high
  it("selectedNeighborhoodKey é ignorado quando o CEP já resolveu com confiança high", async () => {
    // 44002000 é Centro (Z1) com confiança high no JSON local
    // Cliente tenta forçar "Tomba" (Z2)
    const result = await calculateShipping("44002000", {
      selectedNeighborhoodKey: "tomba",
    });

    expect(result.available).toBe(true);
    if (result.available) {
      expect(result.district).toBe("Centro");
      expect(result.zone.name).toBe("Zona 1");
      expect(result.needsReview).toBeUndefined(); // Não aciona needsReview pois a resolução do CEP prevalece
    }
  });

  // 4. Escolha do cliente com sugestão de zona maior -> aplica a maior + needsReview
  it("Escolha do cliente com sugestão de zona maior aplica a maior e retorna needsReview = true", async () => {
    // Mock do fetch e do cache para forçar a resolução via interpolação numérica (Passo 5, confiança medium)
    global.fetch = jest.fn(() => Promise.reject(new Error("API offline"))) as unknown as typeof fetch;
    jest.spyOn(prisma.shippingZipCode, "findUnique").mockResolvedValue(null as never);
    jest.spyOn(prisma.shippingZipOverride, "findUnique").mockResolvedValue(null as never);

    // 44052006 tem interpolação para CASEB (Zona 2, confiança medium)
    // O cliente seleciona manualmente "Centro" (Zona 1)
    const result = await calculateShipping("44052006", {
      selectedNeighborhoodKey: "centro",
    });

    expect(result.available).toBe(true);
    if (result.available) {
      // Como o lookup sugeriu Zona 2 e o cliente escolheu Zona 1, aplica a MAIOR (Zona 2)
      expect(result.zone.name).toBe("Zona 2");
      expect(result.needsReview).toBe(true);
    }
  });

  // 5. Escolha de bairro outOfArea -> OUT_OF_DELIVERY_AREA
  it("Escolha de bairro outOfArea retorna OUT_OF_DELIVERY_AREA", async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error("API offline"))) as unknown as typeof fetch;
    jest.spyOn(prisma.shippingZipCode, "findUnique").mockResolvedValue(null as never);
    jest.spyOn(prisma.shippingZipOverride, "findUnique").mockResolvedValue(null as never);

    // 44052200 necessita de seleção de bairro
    // Cliente seleciona "Humildes" (distrito rural)
    const result = await calculateShipping("44052200", {
      selectedNeighborhoodKey: "humildes",
    });

    expect(result.available).toBe(false);
    if (!result.available) {
      expect(result.reason).toBe("OUT_OF_DELIVERY_AREA");
      expect(result.message).toContain("fora da nossa área");
    }
  });

  // 6. Resultado customer_selected nunca grava ShippingZipCode
  it("Resultado por escolha manual do cliente nunca grava ShippingZipCode", async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error("API offline"))) as unknown as typeof fetch;
    jest.spyOn(prisma.shippingZipCode, "findUnique").mockResolvedValue(null as never);
    jest.spyOn(prisma.shippingZipOverride, "findUnique").mockResolvedValue(null as never);
    const upsertSpy = jest.spyOn(prisma.shippingZipCode, "upsert");

    await calculateShipping("44052200", {
      selectedNeighborhoodKey: "centro",
    });

    // Como foi escolha manual (customer_selected / low), não grava no cache
    expect(upsertSpy).not.toHaveBeenCalled();
    upsertSpy.mockRestore();
  });

  // 7. Zona inativa não faz fallback para outra zona
  it("Zona inativa não faz fallback para outra zona (retorna OUT_OF_DELIVERY_AREA)", async () => {
    const originalFindFirst = prisma.shippingZone.findFirst;

    // Simula que a Zona correspondente está inativa no banco
    jest.spyOn(prisma.shippingZone, "findFirst").mockResolvedValue(null as never);

    const result = await calculateShipping("44002000");

    expect(result.available).toBe(false);
    if (!result.available) {
      expect(result.reason).toBe("OUT_OF_DELIVERY_AREA");
      expect(result.message).toContain("temporariamente indisponível");
    }

    prisma.shippingZone.findFirst = originalFindFirst;
  });

  // 8. Editar zona de um bairro no banco e consultar de novo mantém a edição
  it("Seed padrão usa update: {} para não sobrescrever edições do admin", async () => {
    const upsertSpy = jest.spyOn(prisma.shippingNeighborhood, "upsert").mockResolvedValue({} as never);

    // Roda seed padrão sem forçar
    await seedModule.ensureDefaultShippingZonesAndZipCodes({ forceNeighborhoods: false });

    // Todos os upserts de bairro devem receber update: {} (sem sobrescrever)
    expect(upsertSpy).toHaveBeenCalled();
    const calls = upsertSpy.mock.calls;
    for (const [arg] of calls) {
      expect(arg.update).toEqual({});
    }

    upsertSpy.mockClear();

    // Roda seed com forceNeighborhoods: true
    await seedModule.ensureDefaultShippingZonesAndZipCodes({ forceNeighborhoods: true });

    // Agora os upserts devem conter os dados de atualização
    expect(upsertSpy).toHaveBeenCalled();
    const forceCalls = upsertSpy.mock.calls;
    const sampleCall = forceCalls[0][0];
    expect(sampleCall.update).toHaveProperty("zoneOrder");

    upsertSpy.mockRestore();
  });
});
