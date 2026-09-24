"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  ShoppingCart,
  Package,
  Home,
  ChevronRight,
  TriangleAlert,
  Store,
  Check,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { PageContainer } from "@/components/ui/Page-container";
import Social from "../_components/Social";
import { CartCheckoutModal } from "./CartCheckoutModal";
import type { ProductDetailsProps } from "@/lib/types";
import { useCartStore } from "@/store/cartStore";
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
  const [addedToCart, setAddedToCart] = useState(false);

  const { addItem } = useCartStore();

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      title: product.title,
      price: product.price,
      thumbnail: product.thumbnail,
      code: product.code,
      packageSize: product.packageSize || "SMALL",
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
      packageSize: product.packageSize || "SMALL",
      availableQuantity: product.available_quantity,
    });
    setPixModalOpen(true);
  };

  const isLocal = product.origin === "LOCAL";
  const hasCustomDesc = Boolean(
    product.description && product.description.trim().length > 0
  );
  const hasMlAttrs = Boolean(
    product.attributes && product.attributes.length > 0
  );

  // Garante que seja exibida apenas UMA descrição (nunca ambas simultaneamente):
  // 1. Se configurado como 'ML', prefere atributos do Mercado Livre (se existirem).
  // 2. Se configurado como 'CUSTOM' ou não definido, prioriza a descrição personalizada da loja.
  // 3. Fallback inteligente: se a opção preferida estiver vazia, exibe a outra opção disponível.
  const preferMl = product.descriptionSource === "ML";
  const showMlAttributes = hasMlAttrs && (preferMl || !hasCustomDesc);
  const showCustomDescription = !showMlAttributes && hasCustomDesc;

  return (
    <section>
      <div className="bg-breadcrumb border-b border-gray-300 w-full">
        {/* Breadcrumb */}
        <div className="mx-auto w-full container px-4 sm:px-6 lg:px-8 py-3">
          <nav
            className="flex items-center gap-2 text-sm"
            aria-label="Breadcrumb"
          >
            <Link
              href="/"
              className="flex items-center gap-1 text-primary/60 hover:text-primary transition-colors"
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Home</span>
            </Link>
            <Link
              href="/products-all"
              className="flex items-center gap-1 text-primary/60 hover:text-primary transition-colors"
            >
              <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
              <span className="font-medium">Produtos</span>
            </Link>

            <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
            <span className="text-primary font-medium truncate max-w-[200px]">
              {product.title}
            </span>
          </nav>
        </div>
      </div>
      <PageContainer>
        <div className="mx-auto p-6 my-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Imagens */}
            <div className="space-y-4">
              <div className="aspect-square bg-white rounded-lg overflow-hidden relative w-full">
                {(product.pictures?.[selectedImage]?.secure_url ||
                  product.pictures?.[selectedImage]?.url ||
                  product.thumbnail) && (
                  <Image
                    src={
                      product.pictures?.[selectedImage]?.secure_url ||
                      product.pictures?.[selectedImage]?.url ||
                      product.thumbnail
                    }
                    alt={product.title}
                    fill
                    style={{ objectFit: "contain" }}
                    className="rounded-lg"
                  />
                )}
              </div>

              {product.pictures && product.pictures.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {product.pictures.map((picture, index) => {
                    const picUrl = picture.secure_url || picture.url;
                    return (
                      <button
                        key={picture.id || index}
                        onClick={() => setSelectedImage(index)}
                        className={`flex-shrink-0 w-20 h-20 rounded-md overflow-hidden border-2 ${
                          selectedImage === index
                            ? "border-primary"
                            : "border-gray-200"
                        }`}
                      >
                        <div className="relative w-full h-full">
                          {picUrl && (
                            <Image
                              src={picUrl}
                              alt={`Thumbnail ${index + 1}`}
                              fill
                              style={{ objectFit: "cover" }}
                            />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Informações do Produto */}
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  {product.title}
                </h1>
                <div className="flex items-center gap-2 text-sm sm:text-base font-semibold text-primary mb-2">
                  <span className="flex items-center gap-1">
                    <Package size={12} className="sm:w-4 sm:h-4" />
                    {product.brand?.name || "Pink Music"}
                  </span>
                </div>
              </div>

              <div className="border-t pt-6">
                <div className="text-5xl font-tanker text-foreground mb-2">
                  {formatPrice(product.price, product.currency_id)}
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-primary font-medium">
                    {product.available_quantity > 0
                      ? `${product.available_quantity} disponível${
                          product.available_quantity > 1 ? "s" : ""
                        }`
                      : "Produto esgotado"}
                  </p>
                  {isLocal && (
                    <span className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                      <Store size={12} /> Pronta Entrega na Loja Física
                    </span>
                  )}
                </div>
              </div>

              {/* Aviso de Procedência */}
              {isLocal ? (
                <div className="flex items-start md:items-center gap-2 bg-emerald-50/70 dark:bg-emerald-950/30 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <Store size={20} className="text-emerald-600 flex-shrink-0" />
                  <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                    Produto disponível no balcão da Pink Music para retirada
                    imediata ou entrega local combinada.
                  </p>
                </div>
              ) : (
                <div className="flex items-start md:items-center gap-2">
                  <span className="text-destructive text-sm">
                    <TriangleAlert size={20} />
                  </span>
                  <p className="text-sm font-semibold text-primary">
                    {showCustomDescription
                      ? "Imagens, estoque e disponibilidade são integrados ao Mercado Livre."
                      : "Descrições, características e imagens são de responsabilidade do Mercado Livre."}
                  </p>
                </div>
              )}

              {/* Descrição cadastrada pela loja */}
              {showCustomDescription && (
                <div className="border-t pt-6">
                  <h3 className="text-xl font-semibold mb-3">
                    Descrição do Produto
                  </h3>
                  <p className="text-foreground/80 whitespace-pre-line text-sm leading-relaxed">
                    {product.description}
                  </p>
                </div>
              )}

              {/* Atributos do Mercado Livre / características */}
              {showMlAttributes && (
                <div className="border-t pt-6">
                  <h3 className="text-xl font-semibold mb-3">
                    Características
                  </h3>
                  <div className="space-y-2">
                    {product.attributes!.slice(0, 8).map((attr, index) => (
                      <div
                        key={index}
                        className="flex justify-between py-1 border-b border-card"
                      >
                        <span className="text-primary">{attr.name}:</span>
                        <span className="font-semibold text-primary">
                          {attr.value_name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Botões de Ação */}
              <div className="border-t pt-6 space-y-3">
                {isLocal ? (
                  <>
                    {/* Botão Adicionar ao Carrinho */}
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      disabled={product.available_quantity <= 0}
                      className={`cursor-pointer w-full py-3 px-6 rounded-full flex items-center justify-center gap-2 font-semibold transition-all duration-300 ${
                        addedToCart
                          ? "bg-emerald-500 text-white scale-[0.98]"
                          : "border-2 border-primary text-primary hover:bg-primary/5"
                      }`}
                    >
                      {addedToCart ? (
                        <><Check size={18} /> Adicionado ao Carrinho!</>
                      ) : (
                        <><Plus size={18} /> Adicionar ao Carrinho</>
                      )}
                    </button>

                    {/* Botão Comprar Agora (abre checkout direto) */}
                    <button
                      type="button"
                      onClick={handleBuyNow}
                      disabled={product.available_quantity <= 0}
                      className="cursor-pointer w-full bg-primary text-white py-3 px-6 rounded-full hover:bg-primary/85 flex items-center justify-center gap-2 font-semibold"
                    >
                      <Store size={20} />
                      Comprar Agora via PIX
                    </button>

                    {product.permalink && (
                      <a
                        href={product.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="cursor-pointer w-full border border-primary text-primary py-3 px-6 rounded-full hover:bg-primary/10 flex items-center justify-center gap-2 font-semibold transition-colors"
                      >
                        <ShoppingCart size={18} />
                        Comprar também pelo Mercado Livre
                      </a>
                    )}
                  </>
                ) : (
                  product.permalink && (
                    <a
                      href={product.permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cursor-pointer w-full bg-primary text-white py-3 px-6 rounded-full hover:bg-primary/85 flex items-center justify-center gap-2 font-semibold"
                    >
                      <ShoppingCart size={20} />
                      Comprar no MercadoLivre
                    </a>
                  )
                )}
              </div>

              <div className="w-full flex items-center justify-center lg:mt-12 md:mt-0 mt-0">
                <Social />
              </div>
            </div>
          </div>
        </div>
      </PageContainer>

      {/* Modal de Checkout - agora sempre usa o CartCheckoutModal */}
      <CartCheckoutModal
        open={pixModalOpen}
        onOpenChange={setPixModalOpen}
      />
    </section>
  );
};

export default ProductDetails;
