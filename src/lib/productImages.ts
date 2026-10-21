/**
 * Utilitários para tratamento e otimização de imagens de produtos
 * Suporta produtos locais (Cloudinary) e produtos integrados do Mercado Livre.
 */

/**
 * Converte URLs de imagem do Mercado Livre para a versão em alta resolução original (-O) e protocolo seguro (HTTPS).
 * No Mercado Livre:
 * - URLs terminadas em -I.jpg ou -V.jpg são miniaturas de baixa resolução (70x70 / 90x90).
 * - URLs terminadas em -O.jpg ou -F.jpg são as fotos oficiais em alta resolução do catálogo.
 */
export function getOptimizedImageUrl(url?: string | null): string {
  if (!url) return "/img/placeholder.png";

  let cleanUrl = url.trim();
  if (!cleanUrl || cleanUrl.includes("placeholder")) {
    return "/img/placeholder.png";
  }

  // Garante HTTPS caso a API do ML envie http://
  if (cleanUrl.startsWith("http://")) {
    cleanUrl = cleanUrl.replace("http://", "https://");
  }

  // Se for imagem do Mercado Livre e estiver com sufixo de miniatura (-I ou -V),
  // substitui por alta resolução (-O)
  if (cleanUrl.includes("mlstatic.com") || cleanUrl.includes("mercadolibre.com")) {
    cleanUrl = cleanUrl.replace(/-[IV]\.(jpg|jpeg|png|webp)/i, "-O.$1");
  }

  return cleanUrl;
}

export interface ProductImageSource {
  thumbnail?: string | null;
  pictures?: Array<{ url?: string; secure_url?: string; id?: string }> | null;
  origin?: string | null;
}

/**
 * Retorna a melhor URL de imagem para o Card do Produto, listagens ou miniatura do carrinho.
 * 
 * Regra de prioridade:
 * 1. Imagem do Cloudinary (upload personalizado pelo lojista, seja no thumbnail ou na picture).
 * 2. Imagem em alta resolução de pictures[0] (catálogo oficial do Mercado Livre ou produto local).
 * 3. Thumbnail do produto (convertido para alta resolução se for do Mercado Livre).
 * 4. Placeholder padrão.
 */
export function getProductCardImage(product?: ProductImageSource | null): string {
  if (!product) return "/img/placeholder.png";

  const isCloudinary = (url?: string | null) =>
    Boolean(url && url.includes("res.cloudinary.com"));

  const isPlaceholder = (url?: string | null) =>
    !url || url.includes("placeholder");

  // 1. Se o thumbnail foi personalizado no Cloudinary, tem prioridade máxima
  if (isCloudinary(product.thumbnail)) {
    return product.thumbnail!;
  }

  // 2. Se a primeira foto for do Cloudinary
  const firstPic = product.pictures?.[0];
  const firstPicUrl = firstPic?.secure_url || firstPic?.url;
  if (isCloudinary(firstPicUrl)) {
    return firstPicUrl!;
  }

  // 3. Se houver pictures cadastradas e válidas (fotos de alta resolução do ML ou local)
  if (firstPicUrl && !isPlaceholder(firstPicUrl)) {
    return getOptimizedImageUrl(firstPicUrl);
  }

  // 4. Se não tiver pictures válidas, usa o thumbnail (otimizando se for ML)
  if (product.thumbnail && !isPlaceholder(product.thumbnail)) {
    return getOptimizedImageUrl(product.thumbnail);
  }

  return "/img/placeholder.png";
}

/**
 * Retorna a lista de imagens para a galeria e carrossel de detalhes do produto.
 * Garante que imagens do Cloudinary apareçam na primeira posição e todas as imagens
 * do Mercado Livre estejam em alta resolução.
 */
export function getProductGalleryPictures(product?: ProductImageSource | null): Array<{ id: string; url: string }> {
  if (!product) {
    return [{ id: "placeholder", url: "/img/placeholder.png" }];
  }

  const isCloudinary = (url?: string | null) =>
    Boolean(url && url.includes("res.cloudinary.com"));

  const rawPictures = product.pictures || [];
  const validPictures = rawPictures
    .map((p, index) => ({
      id: p.id || `pic-${index}`,
      url: getOptimizedImageUrl(p.secure_url || p.url),
    }))
    .filter((p) => p.url !== "/img/placeholder.png");

  // Se o thumbnail for do Cloudinary e a primeira picture não for do Cloudinary,
  // garante que a imagem do Cloudinary seja a primeira da galeria
  if (isCloudinary(product.thumbnail)) {
    const thumbUrl = product.thumbnail!;
    const filtered = validPictures.filter((p) => p.url !== thumbUrl);
    return [{ id: "custom-thumb", url: thumbUrl }, ...filtered];
  }

  if (validPictures.length > 0) {
    return validPictures;
  }

  if (product.thumbnail) {
    const optThumb = getOptimizedImageUrl(product.thumbnail);
    if (optThumb !== "/img/placeholder.png") {
      return [{ id: "thumb", url: optThumb }];
    }
  }

  return [{ id: "placeholder", url: "/img/placeholder.png" }];
}
