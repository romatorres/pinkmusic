/**
 * Utilitários para normalização e validação de CEP
 */

/**
 * Remove qualquer caractere não numérico e valida se tem exatamente 8 dígitos.
 * Retorna o CEP limpo (ex: "44002000") ou null se for inválido.
 */
export function normalizeZipCode(rawZipCode: string | null | undefined): string | null {
  if (!rawZipCode || typeof rawZipCode !== "string") {
    return null;
  }

  const clean = rawZipCode.replace(/\D/g, "");

  if (clean.length !== 8) {
    return null;
  }

  // Verifica CEPs inválidos conhecidos (todos dígitos iguais ex: 00000000, 11111111)
  if (/^(\d)\1{7}$/.test(clean)) {
    return null;
  }

  return clean;
}

/**
 * Formata um CEP de 8 dígitos para o padrão visual "XXXXX-XXX".
 */
export function formatZipCode(cleanZipCode: string): string {
  if (!cleanZipCode || cleanZipCode.length !== 8) {
    return cleanZipCode || "";
  }
  return `${cleanZipCode.slice(0, 5)}-${cleanZipCode.slice(5)}`;
}

/**
 * Validador booleano rápido
 */
export function isValidZipCode(rawZipCode: string | null | undefined): boolean {
  return normalizeZipCode(rawZipCode) !== null;
}
