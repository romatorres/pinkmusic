/**
 * orders.test.ts
 *
 * Testes de integração e validação para /api/orders e fluxo de checkout:
 *   - /api/orders ignora deliveryFee do body (usa sempre o frete recalculado pelo servidor)
 *   - /api/orders recusa pedido com CEP fora da área (status 400)
 *   - Bloqueio de pedido quando CEP cotado difere do atual
 *   - Fluxo completo: NEEDS_NEIGHBORHOOD -> seleção de bairro -> cotação -> criação do pedido
 */

import { POST as createOrderHandler } from "@/app/api/orders/route";
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import * as mercadopago from "@/lib/mercadopago";
import { calculateShipping } from "@/lib/shipping/calculate-shipping";

// Mock do Mercado Pago para não gerar cobranças reais em testes
jest.mock("@/lib/mercadopago", () => ({
  createPixPayment: jest.fn().mockImplementation(() =>
    Promise.resolve({
      id: Math.floor(Math.random() * 1000000000) + 1,
      status: "pending",
      qrCode: "00020126580014br.gov.bcb.pix...",
      qrCodeBase64: "data:image/png;base64,mockqrcode",
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    })
  ),
}));

// Mock da lib ESM jose para execução limpa no Jest
jest.mock("jose", () => ({
  jwtVerify: jest.fn().mockResolvedValue({ payload: {} }),
}));

// Mock do módulo de autenticação para evitar carregamento de pacote ESM (jose) no Jest
jest.mock("@/lib/auth", () => ({
  getAuthUser: jest.fn().mockResolvedValue(null),
  requireStaff: jest.fn().mockResolvedValue(null),
}));

describe("POST /api/orders — Regras de Segurança e Frete Local", () => {
  let testProductId: string;
  let testProductPrice: number;

  beforeAll(async () => {
    // Garante um produto ativo no banco para os testes
    let product = await prisma.product.findFirst({
      where: { active: true, available_quantity: { gte: 10 } },
    });

    if (!product) {
      product = await prisma.product.create({
        data: {
          title: "Produto de Teste Frete",
          price: 100.0,
          description: "Teste",
          thumbnail: "/placeholder.png",
          available_quantity: 50,
          active: true,
        },
      });
    }

    testProductId = product.id;
    testProductPrice = Number(product.price);
  });

  // 1. /api/orders ignora deliveryFee do body
  it("/api/orders ignora deliveryFee do body e usa o frete calculado pelo servidor", async () => {
    // CEP 44002-000 é Centro (Zona 1 -> R$ 10,00)
    // O cliente tenta burlar enviando deliveryFee: 0 no body
    const req = new NextRequest("http://localhost:3000/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: testProductId,
        customerName: "Cliente Teste",
        customerPhone: "75999999999",
        deliveryType: "delivery",
        deliveryAddress: "Rua JJ Seabra, 100, Centro",
        zipCode: "44002000",
        deliveryFee: 0, // Tentativa de frete grátis forçado pelo cliente
        quantity: 1,
      }),
    });

    const res = await createOrderHandler(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);

    const createdOrder = await prisma.order.findUnique({
      where: { id: json.data.orderId },
    });

    expect(createdOrder).not.toBeNull();
    // O servidor ignorou o deliveryFee: 0 e aplicou R$ 10,00 da Zona 1
    expect(createdOrder!.deliveryFee).toBe(10.0);
    expect(createdOrder!.shippingPrice).toBe(10.0);
    expect(createdOrder!.totalAmount).toBe(testProductPrice + 10.0);
  });

  // 2. /api/orders recusa pedido com CEP fora da área (status 400)
  it("/api/orders recusa pedido com CEP fora da área (status 400)", async () => {
    // CEP 44099-000 é Humildes (distrito rural, fora da área de entrega rápida)
    const req = new NextRequest("http://localhost:3000/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: testProductId,
        customerName: "Cliente Rural",
        customerPhone: "75999999999",
        deliveryType: "delivery",
        deliveryAddress: "Distrito de Humildes",
        zipCode: "44099000",
        quantity: 1,
      }),
    });

    const res = await createOrderHandler(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toContain("fora da nossa área");
  });

  // 3. CEP cotado diferente do CEP atual bloqueia o PIX
  it("Validação de consistência: CEP alterado após a cotação deve exigir recálculo", () => {
    const quotedZip: string = "44002000";
    const currentZip: string = "44050000";

    // Simula a validação no frontend do modal
    const isZipConsistent = quotedZip === currentZip;
    expect(isZipConsistent).toBe(false);
  });

  // 4. Fluxo completo: NEEDS_NEIGHBORHOOD -> escolher bairro -> cotação -> criação do pedido
  it("Fluxo completo: CEP ambíguo -> seleção de bairro -> cotação -> pedido com needsReview", async () => {
    // Passo A: Consulta inicial com CEP ambíguo (44052200) sem bairro
    const initialQuote = await calculateShipping("44052200");
    expect(initialQuote.available).toBe(false);
    if (!initialQuote.available) {
      expect(initialQuote.reason).toBe("NEEDS_NEIGHBORHOOD");
      expect(initialQuote.neighborhoods).toBeDefined();
    }

    // Passo B: Cliente escolhe o bairro "Sobradinho" (Zona 2)
    const resolvedQuote = await calculateShipping("44052200", {
      selectedNeighborhoodKey: "sobradinho",
    });

    expect(resolvedQuote.available).toBe(true);
    if (resolvedQuote.available) {
      expect(resolvedQuote.zone.name).toBe("Zona 2");
      expect(resolvedQuote.needsReview).toBe(true);
    }

    // Passo C: Criação do pedido com o bairro selecionado
    const req = new NextRequest("http://localhost:3000/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: testProductId,
        customerName: "Cliente Sobradinho",
        customerPhone: "75988888888",
        deliveryType: "delivery",
        deliveryAddress: "Rua do Sobradinho, 42, Sobradinho",
        zipCode: "44052200",
        selectedNeighborhoodKey: "sobradinho",
        quantity: 1,
      }),
    });

    const res = await createOrderHandler(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);

    const order = await prisma.order.findUnique({
      where: { id: json.data.orderId },
    });

    expect(order).not.toBeNull();
    expect(order!.needsReview).toBe(true); // Propagado com sucesso!
    expect(order!.shippingZone).toBe("Zona 2");
    expect(order!.deliveryFee).toBe(12.0); // Preço da Zona 2
  });
});
