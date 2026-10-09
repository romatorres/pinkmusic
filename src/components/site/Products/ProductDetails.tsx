"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  ShoppingCart,
  Store,
  Check,
  ExternalLink,
  ShieldCheck,
  Home,
  ChevronRight,
  PackageCheck,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { PageContainer } from "@/components/ui/Page-container";
import { Button } from "@/components/ui/button";
import { SectionHead } from "../_components/SectionHead";
import ProductCard from "./ProductCard";
import Social from "../_components/Social";
import { CustomerAuthModal } from "../_components/CustomerAuthModal";
import { CartCheckoutModal } from "./CartCheckoutModal";
import type { Product, ProductDetailsProps } from "@/lib/types";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";

const formatPrice = (price: number, currency: string) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency === "BRL" ? "BRL" : "USD",
  }).format(price);
};

const ProductDetails: React.FC<ProductDetailsProps> = ({ product }) => {
  const [selectedImage, setSelectedImage] = useState(0);
  const [pixModalOpen, setPixModalOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);

  // Produtos relacionados
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);

  const { isAuth } = useAuthStore();
  const { addItem } = useCartStore();

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      title: product.title,
      price: product.price,
      thumbnail: product.thumbnail,
      code: product.code,
      availableQuantity: product.available_quantity,
    });
    setAddedToCart(true);
    toast.success(`"${product.title.slice(0, 30)}..." adicionado ao carrinho!`);
    setTimeout(() => setAddedToCart(false), 2500);
  };

  const handleBuyNow = () => {
    addItem({
      productId: product.id,
      title: product.title,
      price: product.price,
      thumbnail: product.thumbnail,
      code: product.code,
      availableQuantity: product.available_quantity,
    });
    if (!isAuth) {
      setShowAuthModal(true);
    } else {
      setPixModalOpen(true);
    }
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    setPixModalOpen(true);
  };

  // Buscar produtos relacionados
  useEffect(() => {
    let cancelled = false;

    const fetchRelated = async () => {
      if (!product.id) return;
      setLoadingRelated(true);
      try {
        const params = new URLSearchParams();
        if (product.categoryId) {
          params.set("categoryIds", product.categoryId);
        } else if (product.brandId) {
          params.set("brandIds", product.brandId);
        }
        params.set("limit", "8");

        const res = await fetch(`/api/products?${params.toString()}`);
        const data = await res.json();
        if (data.success && data.data?.products && !cancelled) {
          const filtered = data.data.products.filter(
            (p: Product) => p.id !== product.id
          );
          setRelatedProducts(filtered.slice(0, 4));
        }
      } catch (err) {
        console.error("Erro ao buscar produtos relacionados:", err);
      } finally {
        if (!cancelled) setLoadingRelated(false);
      }
    };

    fetchRelated();
    return () => {
      cancelled = true;
    };
  }, [product.id, product.categoryId, product.brandId]);

  const isLocal = product.origin === "LOCAL";
  const hasCustomDesc = Boolean(
    product.description && product.description.trim().length > 0
  );
  const hasMlAttrs = Boolean(
    product.attributes && product.attributes.length > 0
  );

  const preferMl = product.descriptionSource === "ML";
  const showMlAttributes = hasMlAttrs && (preferMl || !hasCustomDesc);
  const showCustomDescription = !showMlAttributes && hasCustomDesc;

  // Cálculo de desconto
  const hasDiscount = Boolean(
    product.originalPrice && product.originalPrice > product.price
  );
  const discountPercent = hasDiscount
    ? Math.round(
      ((product.originalPrice! - product.price) / product.originalPrice!) * 100
    )
    : 0;

  const isOutOfStock = product.available_quantity <= 0;

  const currentPictureUrl =
    product.pictures?.[selectedImage]?.secure_url ||
    product.pictures?.[selectedImage]?.url ||
    product.thumbnail;

  return (
    <section className="w-full pb-16">
      <PageContainer>
        {/* Breadcrumb limpo e moderno estilo Lovable */}
        <nav
          aria-label="Navegação estrutural"
          className="flex flex-wrap items-center gap-1.5 pt-4 pb-6 text-sm text-muted-foreground"
        >
          <Link
            href="/"
            className="hover:text-foreground transition-colors flex items-center gap-1"
          >
            <Home className="size-3.5" />
            <span>Início</span>
          </Link>
          <ChevronRight className="size-3.5 text-muted-foreground/60" />
          <Link
            href="/products-all"
            className="hover:text-foreground transition-colors"
          >
            Produtos
          </Link>
          {product.category && (
            <>
              <ChevronRight className="size-3.5 text-muted-foreground/60" />
              <Link
                href={`/products-all?categoryIds=${product.category.id}`}
                className="hover:text-foreground transition-colors truncate max-w-[160px]"
              >
                {product.category.name}
              </Link>
            </>
          )}
          <ChevronRight className="size-3.5 text-muted-foreground/60" />
          <span className="font-medium text-foreground truncate max-w-[240px] sm:max-w-[360px]">
            {product.title}
          </span>
        </nav>

        {/* Grade Principal do Produto */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Coluna Esquerda: Imagens */}
          <div className="space-y-4">
            <div className="relative aspect-square w-full overflow-hidden rounded-3xl border border-border/80 bg-card p-6 flex items-center justify-center shadow-card">
              {/* Badges de destaque */}
              <div className="absolute left-4 top-4 z-10 flex flex-col gap-2">
                {hasDiscount && (
                  <span className="inline-flex items-center rounded-md bg-destructive px-2.5 py-1 text-xs font-bold text-white shadow-xs">
                    -{discountPercent}% OFF
                  </span>
                )}
              </div>



              {currentPictureUrl && (
                <Image
                  src={currentPictureUrl}
                  alt={product.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                  className="object-contain p-6 transition-transform duration-300 hover:scale-105"
                />
              )}
            </div>

            {/* Carrossel de Miniaturas */}
            {product.pictures && product.pictures.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                {product.pictures.map((picture, index) => {
                  const picUrl = picture.secure_url || picture.url;
                  const isSelected = selectedImage === index;
                  return (
                    <button
                      key={picture.id || index}
                      type="button"
                      onClick={() => setSelectedImage(index)}
                      className={`relative flex-shrink-0 size-20 rounded-2xl overflow-hidden border-2 bg-card p-1 transition-all cursor-pointer ${isSelected
                        ? "border-primary ring-2 ring-primary/20 scale-105 shadow-xs"
                        : "border-border/80 opacity-70 hover:opacity-100 hover:border-muted-foreground/40"
                        }`}
                    >
                      {picUrl && (
                        <Image
                          src={picUrl}
                          alt={`Thumbnail ${index + 1}`}
                          fill
                          className="object-contain p-1"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Coluna Direita: Informações e Ações */}
          <div className="flex flex-col justify-between">
            <div>
              {/* Cabeçalho: Marca + Badge de Procedência */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {product.brand?.name || "Pink Music"}
                </span>

                {isLocal ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1 text-xs font-bold uppercase tracking-wider border border-emerald-500/20">
                    <Store className="size-3.5" /> Venda Local
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 px-3 py-1 text-xs font-bold uppercase tracking-wider border border-amber-500/20">
                    <ExternalLink className="size-3.5" /> Mercado Livre
                  </span>
                )}
              </div>

              {/* Título do Produto */}
              <h1 className="mt-2 text-2xl sm:text-3xl md:text-4xl font-extrabold text-foreground leading-tight tracking-tight">
                {product.title}
              </h1>

              {product.code && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Código: <span className="font-mono">{product.code}</span>
                </p>
              )}

              {/* Bloco de Preço estilo Lovable */}
              <div className="mt-6 pt-6 border-t border-border/60">
                {hasDiscount && product.originalPrice && (
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm sm:text-base text-muted-foreground line-through">
                      {formatPrice(product.originalPrice, product.currency_id)}
                    </span>
                    <span className="text-xs font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded-md">
                      -{discountPercent}%
                    </span>
                  </div>
                )}

                <div className="text-4xl sm:text-5xl font-extrabold text-foreground tracking-tight">
                  {formatPrice(product.price, product.currency_id)}
                </div>


                <p className="mt-1.5 text-sm text-muted-foreground">
                  Compre parcelado em até 12x no Mercado Livre
                </p>


                <div className="mt-4 flex items-center gap-2">
                  <span
                    className={`inline-block size-2.5 rounded-full ${product.available_quantity > 0
                      ? "bg-emerald-500"
                      : "bg-destructive"
                      }`}
                  />
                  <span className="text-sm font-medium text-muted-foreground">
                    {product.available_quantity > 0
                      ? `${product.available_quantity} unidade${product.available_quantity > 1 ? "s" : ""
                      } disponível${product.available_quantity > 1 ? "is" : ""}`
                      : "Produto temporariamente indisponível"}
                  </span>
                </div>
              </div>

              {/* Cartão de Informação de Procedência */}
              {isLocal ? (
                <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="size-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400">
                      <Store className="size-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground">
                        Retirada ou Entrega em Feira de Santana
                      </h4>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                        Pronto para retirada no balcão da loja ou entrega combinada na cidade. Pagamento rápido e seguro via PIX.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-border bg-card p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                      <ShieldCheck className="size-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground">
                        Compra Segura pelo Mercado Livre
                      </h4>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                        Estoque oficial integrado, envio rápido com rastreamento e todas as garantias do Mercado Livre.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Botões de Ação */}
              <div className="mt-6 pt-6 border-t border-border/60 space-y-3">
                {isLocal ? (
                  <>
                    <Button
                      onClick={handleBuyNow}
                      disabled={isOutOfStock}
                      size="lg"
                      className="w-full h-13 rounded-2xl text-base font-bold shadow-md hover:shadow-lg transition-all gap-2"
                    >
                      <Zap className="size-5" />
                      Comprar Agora via PIX
                    </Button>

                    <Button
                      variant="outline"
                      onClick={handleAddToCart}
                      disabled={isOutOfStock}
                      size="lg"
                      className={`w-full h-12 rounded-2xl text-sm font-semibold border-2 transition-all gap-2 ${addedToCart
                        ? "bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600"
                        : "border-primary/40 text-foreground hover:bg-primary/5 hover:border-primary"
                        }`}
                    >
                      {addedToCart ? (
                        <>
                          <Check className="size-4" /> No carrinho!
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="size-4" /> Adicionar ao Carrinho
                        </>
                      )}
                    </Button>

                    {product.permalink && (
                      <a
                        href={product.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ExternalLink className="size-3.5" />
                        Comprar também pelo Mercado Livre
                      </a>
                    )}
                  </>
                ) : (
                  product.permalink && (
                    <Button
                      asChild
                      size="lg"
                      className="w-full h-13 rounded-2xl text-base font-bold shadow-md hover:shadow-lg transition-all gap-2"
                    >
                      <a
                        href={product.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="size-5" />
                        Comprar no Mercado Livre
                      </a>
                    </Button>
                  )
                )}
              </div>
            </div>

            {/* Redes Sociais / Dúvidas */}
            <div className="mt-8 pt-6 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-muted-foreground">
                Dúvidas sobre o produto? Fale conosco:
              </span>
              <Social />
            </div>
          </div>
        </div>

        {/* Seções de Detalhes: Descrição e Características */}
        {(showCustomDescription || showMlAttributes) && (
          <div className="mt-16 sm:mt-20 pt-10 border-t border-border/60">
            {showCustomDescription && (
              <div className="max-w-3xl">
                <h3 className="text-xl font-bold font-display text-foreground mb-4">
                  Descrição do Produto
                </h3>
                <p className="text-muted-foreground whitespace-pre-line text-[15px] leading-relaxed">
                  {product.description}
                </p>
              </div>
            )}

            {showMlAttributes && (
              <div className="mt-8">
                <h3 className="text-xl font-bold font-display text-foreground mb-4">
                  Especificações Técnicas
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {product.attributes!.slice(0, 12).map((attr, index) => (
                    <div
                      key={index}
                      className="rounded-xl border border-border/80 bg-card p-3.5 flex flex-col justify-between"
                    >
                      <span className="text-xs text-muted-foreground">
                        {attr.name}
                      </span>
                      <span className="text-sm font-semibold text-foreground mt-1">
                        {attr.value_name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Seção de Produtos Relacionados */}
        {relatedProducts.length > 0 && (
          <section className="mt-16 sm:mt-24 pt-12 border-t border-border/60">
            <SectionHead
              title="Produtos Relacionados"
              subtitle="Equipamentos selecionados que você também pode gostar."
            />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 md:gap-5">
              {relatedProducts.map((relProduct) => (
                <ProductCard key={relProduct.id} product={relProduct} />
              ))}
            </div>
          </section>
        )}
      </PageContainer>

      {/* Modal de autenticação para clientes */}
      <CustomerAuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        onSuccess={handleAuthSuccess}
        required
      />

      {/* Modal de Checkout direto */}
      <CartCheckoutModal
        open={pixModalOpen}
        onOpenChange={setPixModalOpen}
      />
    </section>
  );
};

export default ProductDetails;
