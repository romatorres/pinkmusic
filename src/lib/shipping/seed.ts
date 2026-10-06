import prisma from "@/lib/prisma";

export async function ensureDefaultShippingZonesAndZipCodes() {
  const existingZonesCount = await prisma.shippingZone.count();

  let zone1Id: string | null = null;
  let zone2Id: string | null = null;
  let zone3Id: string | null = null;

  if (existingZonesCount === 0) {
    console.log("[shipping/seed] Criando as 3 zonas iniciais de entrega...");

    const z1 = await prisma.shippingZone.create({
      data: {
        name: "Zona 1",
        description: "0 até 3 km (Centro e bairros adjacentes)",
        minDistance: 0,
        maxDistance: 3,
        price: 8.90,
        active: true,
      },
    });
    zone1Id = z1.id;

    const z2 = await prisma.shippingZone.create({
      data: {
        name: "Zona 2",
        description: "Acima de 3 até 6 km (Região intermediária de Feira)",
        minDistance: 3,
        maxDistance: 6,
        price: 11.90,
        active: true,
      },
    });
    zone2Id = z2.id;

    const z3 = await prisma.shippingZone.create({
      data: {
        name: "Zona 3",
        description: "Acima de 6 até 10 km (Região perimetral e anel viário)",
        minDistance: 6,
        maxDistance: 10,
        price: 15.90,
        active: true,
      },
    });
    zone3Id = z3.id;
  } else {
    const zones = await prisma.shippingZone.findMany({
      orderBy: { minDistance: "asc" },
    });
    zone1Id = zones[0]?.id || null;
    zone2Id = zones[1]?.id || null;
    zone3Id = zones[2]?.id || null;
  }

  // Exemplos de CEPs conhecidos em Feira de Santana - BA para testes
  const initialZipCodes = [
    {
      zipCode: "44002000",
      district: "Centro / Kalilândia",
      city: "Feira de Santana",
      state: "BA",
      latitude: -12.2576,
      longitude: -38.9634,
      zoneId: zone1Id,
    },
    {
      zipCode: "44001000",
      district: "Centro",
      city: "Feira de Santana",
      state: "BA",
      latitude: -12.2612,
      longitude: -38.9675,
      zoneId: zone1Id,
    },
    {
      zipCode: "44002100",
      district: "Kalilândia",
      city: "Feira de Santana",
      state: "BA",
      latitude: -12.2568,
      longitude: -38.9610,
      zoneId: zone1Id,
    },
    {
      zipCode: "44050000",
      district: "Cidade Nova",
      city: "Feira de Santana",
      state: "BA",
      latitude: -12.2341,
      longitude: -38.9480,
      zoneId: zone2Id,
    },
    {
      zipCode: "44075000",
      district: "Tomba",
      city: "Feira de Santana",
      state: "BA",
      latitude: -12.2850,
      longitude: -38.9450,
      zoneId: zone2Id,
    },
    {
      zipCode: "44052000",
      district: "Sobradinho",
      city: "Feira de Santana",
      state: "BA",
      latitude: -12.2420,
      longitude: -38.9750,
      zoneId: zone1Id,
    },
    {
      zipCode: "44085000",
      district: "SIM",
      city: "Feira de Santana",
      state: "BA",
      latitude: -12.2680,
      longitude: -38.8950,
      zoneId: zone3Id,
    },
  ];

  for (const item of initialZipCodes) {
    const existing = await prisma.shippingZipCode.findUnique({
      where: { zipCode: item.zipCode },
    });
    if (!existing) {
      await prisma.shippingZipCode.create({
        data: item,
      });
    }
  }
}
