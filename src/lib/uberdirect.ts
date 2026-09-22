/**
 * Integração com a API do Uber Direct — Entregas sob demanda
 * Documentação: https://developer.uber.com/docs/deliveries/introduction
 *
 * Credenciais necessárias no .env.local:
 *   UBER_CLIENT_ID        → ID de Cliente do Desenvolvedor
 *   UBER_CLIENT_SECRET    → Client Secret
 *   UBER_CUSTOMER_ID      → ID do Usuário (conta Uber Direct)
 *   STORE_ADDRESS         → Endereço da loja (ponto de coleta)
 *   STORE_LAT / STORE_LNG → Coordenadas da loja
 */

const UBER_BASE_URL = "https://api.uber.com/v1";
const UBER_AUTH_URL = "https://auth.uber.com/oauth/v2/token";

// Cache simples do token de acesso
let cachedToken: { value: string; expiresAt: number } | null = null;

/**
 * Obtém o Access Token via OAuth2 Client Credentials.
 * Reutiliza token em cache enquanto ainda for válido.
 */
async function getUberAccessToken(): Promise<string> {
  const clientId = process.env.UBER_CLIENT_ID;
  const clientSecret = process.env.UBER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "UBER_CLIENT_ID e UBER_CLIENT_SECRET não configurados nas variáveis de ambiente."
    );
  }

  // Reutiliza token se ainda válido (com 60s de margem)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.value;
  }

  const response = await fetch(UBER_AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
      scope: "eats.deliveries",
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error_description || "Falha ao autenticar com o Uber Direct."
    );
  }

  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return cachedToken.value;
}

export interface DeliveryAddress {
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

export interface DeliveryQuote {
  quoteId: string;
  fee: number;        // em centavos
  currency: string;
  estimatedMinutes: number;
  expiresAt: string;
}

/**
 * Solicita cotação de entrega ao Uber Direct.
 * Retorna preço e tempo estimado antes de confirmar o despacho.
 */
export async function getDeliveryQuote(
  dropoff: DeliveryAddress
): Promise<DeliveryQuote> {
  const token = await getUberAccessToken();
  const customerId = process.env.UBER_CUSTOMER_ID;

  if (!customerId) {
    throw new Error("UBER_CUSTOMER_ID não configurado.");
  }

  const pickup: DeliveryAddress = {
    street_address: process.env.STORE_ADDRESS || "Rua Exemplo, 123, Centro",
    city: process.env.STORE_CITY || "Feira de Santana",
    state: process.env.STORE_STATE || "BA",
    zip_code: process.env.STORE_ZIP || "44001-000",
    country: "BR",
    latitude: parseFloat(process.env.STORE_LAT || "-12.2664"),
    longitude: parseFloat(process.env.STORE_LNG || "-38.9663"),
  };

  const response = await fetch(
    `${UBER_BASE_URL}/customers/${customerId}/delivery_quotes`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        pickup_address: JSON.stringify(pickup),
        dropoff_address: JSON.stringify(dropoff),
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("[Uber Direct] Erro na cotação:", data);
    throw new Error(
      data.message || "Erro ao obter cotação do Uber Direct."
    );
  }

  return {
    quoteId: data.id,
    fee: data.fee,
    currency: data.currency,
    estimatedMinutes: data.duration,
    expiresAt: data.expires,
  };
}

export interface CreateDeliveryInput {
  orderId: string;
  customerName: string;
  customerPhone: string;
  dropoff: DeliveryAddress;
  quoteId?: string;
  productTitle: string;
}

export interface DeliveryResult {
  deliveryId: string;
  trackingUrl: string;
  status: string;
  courierName?: string;
}

/**
 * Cria uma entrega no Uber Direct e retorna o ID e link de rastreamento.
 */
export async function createDelivery(
  input: CreateDeliveryInput
): Promise<DeliveryResult> {
  const token = await getUberAccessToken();
  const customerId = process.env.UBER_CUSTOMER_ID;

  if (!customerId) {
    throw new Error("UBER_CUSTOMER_ID não configurado.");
  }

  const pickupAddress: DeliveryAddress = {
    street_address: process.env.STORE_ADDRESS || "Rua Exemplo, 123, Centro",
    city: process.env.STORE_CITY || "Feira de Santana",
    state: process.env.STORE_STATE || "BA",
    zip_code: process.env.STORE_ZIP || "44001-000",
    country: "BR",
    latitude: parseFloat(process.env.STORE_LAT || "-12.2664"),
    longitude: parseFloat(process.env.STORE_LNG || "-38.9663"),
  };

  const payload = {
    quote_id: input.quoteId,
    external_id: input.orderId,
    pickup: {
      name: "Pink Music Instrumentos",
      phone_number: process.env.STORE_PHONE || "+5575991988685",
      address: JSON.stringify(pickupAddress),
      notes: `Pedido #${input.orderId}`,
    },
    dropoff: {
      name: input.customerName,
      phone_number: input.customerPhone.replace(/\D/g, "").startsWith("55")
        ? `+${input.customerPhone.replace(/\D/g, "")}`
        : `+55${input.customerPhone.replace(/\D/g, "")}`,
      address: JSON.stringify(input.dropoff),
      notes: `Produto: ${input.productTitle}`,
    },
    manifest_items: [
      {
        name: input.productTitle.slice(0, 100),
        quantity: 1,
        size: "medium",
      },
    ],
  };

  const response = await fetch(
    `${UBER_BASE_URL}/customers/${customerId}/deliveries`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("[Uber Direct] Erro ao criar entrega:", data);
    throw new Error(data.message || "Erro ao criar entrega no Uber Direct.");
  }

  return {
    deliveryId: data.id,
    trackingUrl: data.tracking_url,
    status: data.status,
    courierName: data.courier?.name,
  };
}

/**
 * Consulta o status atual de uma entrega no Uber Direct.
 */
export async function getDeliveryStatus(deliveryId: string) {
  const token = await getUberAccessToken();
  const customerId = process.env.UBER_CUSTOMER_ID;

  const response = await fetch(
    `${UBER_BASE_URL}/customers/${customerId}/deliveries/${deliveryId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Erro ao consultar entrega no Uber Direct.");
  }

  return {
    deliveryId: data.id,
    status: data.status,
    trackingUrl: data.tracking_url,
    courier: data.courier
      ? { name: data.courier.name, phone: data.courier.phone_number }
      : null,
  };
}
