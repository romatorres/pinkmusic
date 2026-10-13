import prisma from "@/lib/prisma";
import { getFirebaseAdminMessaging } from "./admin";
import type { SendResponse } from "firebase-admin/messaging";

export interface PushResult {
  success: boolean;
  sentCount: number;
  tokensCount: number;
  invalidTokensRemoved?: number;
  error?: string;
}

/**
 * Notifica administradores e vendedores sobre um pedido com pagamento confirmado.
 * Garante idempotência verificando e marcando order.pushNotifiedAt.
 */
export async function notifyOrderConfirmed(orderId: string): Promise<PushResult> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
      },
    });

    if (!order) {
      console.warn(`[Push FCM] Pedido ${orderId} não encontrado.`);
      return { success: false, sentCount: 0, tokensCount: 0, error: "Pedido não encontrado" };
    }

    if (order.status !== "PAID") {
      console.warn(`[Push FCM] Pedido ${orderId} não está com status PAID (${order.status}). Ignorando push.`);
      return { success: false, sentCount: 0, tokensCount: 0, error: "Pedido não pago" };
    }

    // Idempotência: se já foi notificado anteriormente, não duplica
    if (order.pushNotifiedAt) {
      console.log(`[Push FCM] Pedido ${orderId} já teve notificação push enviada anteriormente em ${order.pushNotifiedAt.toISOString()}.`);
      return { success: true, sentCount: 0, tokensCount: 0 };
    }

    // Marca como notificado imediatamente para evitar concorrência entre webhook e polling
    await prisma.order.update({
      where: { id: orderId },
      data: { pushNotifiedAt: new Date() },
    });

    // Busca subscriptions ativas de todos os usuários com papel ADMIN ou EMPLOYEE
    const staffSubscriptions = await prisma.pushSubscription.findMany({
      where: {
        enabled: true,
        user: {
          role: { in: ["ADMIN", "EMPLOYEE"] },
        },
      },
      select: {
        id: true,
        token: true,
      },
    });

    if (staffSubscriptions.length === 0) {
      console.log("[Push FCM] Nenhum dispositivo de vendedor/admin cadastrado para receber notificações.");
      return { success: true, sentCount: 0, tokensCount: 0 };
    }

    const tokens = Array.from(new Set(staffSubscriptions.map((s) => s.token)));
    const messaging = getFirebaseAdminMessaging();

    const shortId = order.id.slice(-6).toUpperCase();
    const formattedAmount = order.totalAmount.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

    const title = "🛒 Nova venda confirmada!";
    const body = `Pedido #${shortId} — ${formattedAmount} • ${order.customerName || "Cliente"}`;
    const destinationUrl = `/dashboard/orders`;

    const response = await messaging.sendEachForMulticast({
      tokens,
      notification: {
        title,
        body,
      },
      data: {
        type: "ORDER_CONFIRMED",
        orderId: order.id,
        url: destinationUrl,
      },
      webpush: {
        fcmOptions: {
          link: destinationUrl,
        },
        notification: {
          icon: "/img/pinkmusic-logo.png",
          badge: "/img/pinkmusic-logo.png",
          tag: `order-${order.id}`,
        },
      },
    });

    // Trata tokens inválidos retornados pelo FCM
    const tokensToRemove: string[] = [];
    response.responses.forEach((resp: SendResponse, idx: number) => {
      if (!resp.success && resp.error) {
        const errCode = resp.error.code;
        if (
          errCode === "messaging/invalid-registration-token" ||
          errCode === "messaging/registration-token-not-registered"
        ) {
          tokensToRemove.push(tokens[idx]);
        }
      }
    });

    if (tokensToRemove.length > 0) {
      await prisma.pushSubscription.updateMany({
        where: { token: { in: tokensToRemove } },
        data: { enabled: false },
      });
      console.log(`[Push FCM] ${tokensToRemove.length} tokens inválidos foram desativados.`);
    }

    console.log(
      `[Push FCM] ✅ Notificação do Pedido #${shortId} enviada para ${response.successCount}/${tokens.length} dispositivos.`
    );

    return {
      success: true,
      sentCount: response.successCount,
      tokensCount: tokens.length,
      invalidTokensRemoved: tokensToRemove.length,
    };
  } catch (error: unknown) {
    console.error("[Push FCM] Erro ao enviar notificação de pedido confirmado:", error);
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    return {
      success: false,
      sentCount: 0,
      tokensCount: 0,
      error: msg,
    };
  }
}

/**
 * Envia notificação de teste apenas para os dispositivos do usuário solicitante
 */
export async function sendTestNotificationToUser(userId: string): Promise<PushResult> {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: {
      userId,
      enabled: true,
    },
    select: {
      id: true,
      token: true,
    },
  });

  if (subscriptions.length === 0) {
    return {
      success: false,
      sentCount: 0,
      tokensCount: 0,
      error: "Nenhum dispositivo registrado para este usuário.",
    };
  }

  const tokens = Array.from(new Set(subscriptions.map((s) => s.token)));
  const messaging = getFirebaseAdminMessaging();

  const title = "Pink Music — Notificações ativadas! 🎵";
  const body = "Seu dispositivo está pronto para receber alertas de novas vendas em tempo real.";

  const response = await messaging.sendEachForMulticast({
    tokens,
    notification: {
      title,
      body,
    },
    data: {
      type: "TEST_NOTIFICATION",
      url: "/dashboard/orders",
    },
    webpush: {
      fcmOptions: {
        link: "/dashboard/orders",
      },
      notification: {
        icon: "/img/pinkmusic-logo.png",
      },
    },
  });

  const tokensToRemove: string[] = [];
  response.responses.forEach((resp: SendResponse, idx: number) => {
    if (!resp.success && resp.error) {
      const errCode = resp.error.code;
      if (
        errCode === "messaging/invalid-registration-token" ||
        errCode === "messaging/registration-token-not-registered"
      ) {
        tokensToRemove.push(tokens[idx]);
      }
    }
  });

  if (tokensToRemove.length > 0) {
    await prisma.pushSubscription.updateMany({
      where: { token: { in: tokensToRemove } },
      data: { enabled: false },
    });
  }

  return {
    success: true,
    sentCount: response.successCount,
    tokensCount: tokens.length,
    invalidTokensRemoved: tokensToRemove.length,
  };
}
