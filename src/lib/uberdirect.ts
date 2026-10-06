/**
 * Integração Uber Direct desativada.
 * A aplicação agora utiliza o sistema próprio de cálculo de frete por zonas e distância em Feira de Santana.
 * Consulte: @/lib/shipping/calculate-shipping
 */

export async function getDeliveryQuote() {
  throw new Error("Integração Uber Direct desativada. Use o sistema de frete local próprio.");
}

export async function createDelivery() {
  throw new Error("Integração Uber Direct desativada. Use o sistema de frete local próprio.");
}

export async function cancelDelivery() {
  return false;
}
