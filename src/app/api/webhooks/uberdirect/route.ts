import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";

/**
 * POST /api/webhooks/uberdirect
 *
 * Recebe eventos do Uber Direct sobre o status da entrega.
 * Documentação: https://developer.uber.com/docs/deliveries/guides/webhooks
 *
 * Validação de Assinatura:
 *   A Uber assina o corpo da requisição usando HMAC-SHA256 no cabeçalho `x-uber-signature`.
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-uber-signature");
    const clientSecret = process.env.UBER_CLIENT_SECRET?.trim().replace(/^["']|["']$/g, "");
    const webhookSecret = process.env.UBER_WEBHOOK_SECRET?.trim().replace(/^["']|["']$/g, "");
    const secretToUse = webhookSecret || clientSecret;

    // Se houver credencial configurada, valida a assinatura HMAC
    if (secretToUse) {
      if (!signature) {
        console.warn("[Webhook Uber Direct] Requisição rejeitada: cabeçalho x-uber-signature ausente.");
        return NextResponse.json({ error: "Assinatura ausente." }, { status: 401 });
      }

      const expectedSignature = crypto
        .createHmac("sha256", secretToUse)
        .update(rawBody)
        .digest("hex");

      const signatureBuffer = Buffer.from(signature, "hex");
      const expectedBuffer = Buffer.from(expectedSignature, "hex");

      if (
        signatureBuffer.length !== expectedBuffer.length ||
        !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
      ) {
        console.warn("[Webhook Uber Direct] Assinatura inválida detectada.");
        return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 });
      }
    }

    const body = JSON.parse(rawBody);
    const { kind, data } = body;

    // Só processa eventos de mudança de status de entrega
    if (kind !== "event.delivery_status" && kind !== "status.changed") {
      return NextResponse.json({ received: true });
    }

    const deliveryId: string = data?.id || data?.delivery_id;
    const uberStatus: string = data?.status;
    const externalId: string = data?.external_id; // nosso orderId
    const courier = data?.courier;

    if (!deliveryId && !externalId) {
      return NextResponse.json({ received: true });
    }

    // Mapeia status do Uber para nosso enum
    const statusMap: Record<string, string> = {
      delivered: "DELIVERED",
      cancelled: "CANCELLED",
      returned: "CANCELLED",
    };

    const newStatus = uberStatus ? statusMap[uberStatus] : undefined;

    // Monta dados de atualização
    const updateData: Record<string, unknown> = {};
    if (newStatus) {
      updateData.status = newStatus;
    }
    if (courier?.name) {
      updateData.uberCourierName = courier.name;
    }
    if (courier?.phone_number) {
      updateData.uberCourierPhone = courier.phone_number;
    }
    if (courier?.vehicle_type) {
      updateData.uberVehicleType = courier.vehicle_type;
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.order.updateMany({
        where: {
          OR: [
            ...(deliveryId ? [{ uberDeliveryId: deliveryId }] : []),
            ...(externalId ? [{ id: externalId }] : []),
          ],
        },
        data: updateData,
      });

      console.log(
        `[Webhook Uber] Entrega ${deliveryId || externalId} atualizada:`,
        updateData
      );
    } else {
      console.log(`[Webhook Uber] Evento "${uberStatus}" para entrega ${deliveryId} (sem dados para atualizar).`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("[Webhook Uber Direct] Erro:", error);
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
