/**
 * Integração com a API do Mercado Pago — Pagamentos PIX
 * Documentação: https://www.mercadopago.com.br/developers/pt/docs/checkout-api/payment-methods/other-payment-methods/pix
 */

const MP_BASE_URL = "https://api.mercadopago.com";

/**
 * Retorna o Access Token do Mercado Pago, priorizando o token de produção.
 * Em sandbox, usa o MERCADOPAGO_TEST_TOKEN.
 */
function getMPAccessToken(): string {
  const token =
    process.env.MERCADOPAGO_ACCESS_TOKEN ||
    process.env.MERCADOPAGO_TEST_TOKEN;
  if (!token) {
    throw new Error(
      "MERCADOPAGO_ACCESS_TOKEN não configurado nas variáveis de ambiente."
    );
  }
  return token.trim();
}

export interface PixPaymentInput {
  orderId: string;
  amount: number;
  customerEmail?: string;
  customerName: string;
  customerCpf?: string;
  description: string;
}

export interface PixPaymentResult {
  id: number;
  status: string;
  qrCode: string;        // string copia-e-cola
  qrCodeBase64: string;  // imagem base64 do QR
  expiresAt: string;     // ISO 8601
}

/**
 * Cria um pagamento PIX dinâmico no Mercado Pago.
 * Retorna o QR Code (string e base64) para exibição ao cliente.
 */
export async function createPixPayment(
  input: PixPaymentInput
): Promise<PixPaymentResult> {
  const token = getMPAccessToken();

  const payload = {
    transaction_amount: input.amount,
    description: input.description,
    payment_method_id: "pix",
    payer: {
      email: input.customerEmail || "cliente@pinkmusic.com.br",
      first_name: input.customerName.split(" ")[0] || input.customerName,
      last_name: input.customerName.split(" ").slice(1).join(" ") || "",
      identification: input.customerCpf
        ? { type: "CPF", number: input.customerCpf }
        : undefined,
    },
    external_reference: input.orderId,
    // PIX expira em 30 minutos
    date_of_expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    // Envia notification_url apenas se for uma URL pública válida (https:// e não localhost)
    ...(() => {
      const rawUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.APP_URL ||
        "https://www.pinkmusic.com.br";
      const cleanUrl = rawUrl.trim().replace(/\/+$/, "");
      if (cleanUrl.startsWith("https://") && !cleanUrl.includes("localhost")) {
        return { notification_url: `${cleanUrl}/api/webhooks/mercadopago` };
      }
      return {};
    })(),
  };

  const response = await fetch(`${MP_BASE_URL}/v1/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-Idempotency-Key": input.orderId,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("[Mercado Pago] Erro ao criar pagamento PIX:", data);
    throw new Error(
      data.message ||
        data.cause?.[0]?.description ||
        "Erro ao criar pagamento PIX no Mercado Pago."
    );
  }

  const pixInfo = data.point_of_interaction?.transaction_data;

  if (!pixInfo?.qr_code || !pixInfo?.qr_code_base64) {
    throw new Error(
      "Resposta do Mercado Pago não contém dados do QR Code PIX."
    );
  }

  return {
    id: data.id,
    status: data.status,
    qrCode: pixInfo.qr_code,
    qrCodeBase64: pixInfo.qr_code_base64,
    expiresAt: payload.date_of_expiration,
  };
}

export interface PaymentStatus {
  id: number;
  status: "pending" | "approved" | "cancelled" | "rejected" | string;
  externalReference: string | null;
  paidAt: string | null;
}

/**
 * Consulta o status atual de um pagamento no Mercado Pago.
 * Usado para polling enquanto o cliente aguarda a confirmação do PIX.
 */
export async function getPaymentStatus(
  paymentId: string
): Promise<PaymentStatus> {
  const token = getMPAccessToken();

  const response = await fetch(`${MP_BASE_URL}/v1/payments/${paymentId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    // Sem cache — sempre busca o status mais recente
    cache: "no-store",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Erro ao consultar status do pagamento no Mercado Pago."
    );
  }

  return {
    id: data.id,
    status: data.status,
    externalReference: data.external_reference ?? null,
    paidAt: data.date_approved ?? null,
  };
}
