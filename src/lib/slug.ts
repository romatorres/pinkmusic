/**
 * Utilitários para criação e resolução de Slugs amigáveis (SEO) para produtos da Pink Music.
 *
 * Formato padrão: [nome-do-produto-amigavel]--[ID]
 * Exemplo: mesa-de-som-digital-soundcraft-ui24r--MLB3312824304
 */

/**
 * Converte qualquer texto em slug limpo para SEO (sem acentos, minúsculo, hífens simples).
 */
export function slugify(text: string): string {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^\w\s-]/g, "") // remove caracteres especiais
    .trim()
    .replace(/\s+/g, "-") // substitui espaços por hífens
    .replace(/-+/g, "-"); // remove hífens consecutivos
}

/**
 * Cria a URL amigável do produto combinando o título e o ID original.
 * Ex: createProductSlug("Mesa De Som Soundcraft Ui24r", "MLB3312824304")
 *  -> "mesa-de-som-soundcraft-ui24r--MLB3312824304"
 */
export function createProductSlug(title: string, id: string): string {
  const cleanTitle = slugify(title);
  if (!cleanTitle) return id;
  return `${cleanTitle}--${id}`;
}

/**
 * Extrai com precisão o ID original do produto a partir de um slug ou ID direto.
 * Suporta:
 *   - "mesa-de-som-soundcraft-ui24r--MLB3312824304" -> "MLB3312824304"
 *   - "MLB3312824304" -> "MLB3312824304" (retrocompatibilidade)
 *   - "guitarra-fender-stratocaster--cuid12345" -> "cuid12345"
 */
export function extractProductId(slugOrId: string): string {
  if (!slugOrId) return "";
  const decoded = decodeURIComponent(slugOrId);
  if (decoded.includes("--")) {
    const parts = decoded.split("--");
    const potentialId = parts[parts.length - 1];
    if (potentialId) return potentialId;
  }
  return decoded;
}
