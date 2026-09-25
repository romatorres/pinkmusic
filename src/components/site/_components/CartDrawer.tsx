"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  ShoppingCart,
  Trash2,
  Minus,
  Plus,
  ShoppingBag,
  ArrowRight,
  Music2,
  Package,
} from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { CustomerAuthModal } from "@/components/site/_components/CustomerAuthModal";
import { useAuthStore } from "@/store/authStore";
import { CartCheckoutModal } from "@/components/site/Products/CartCheckoutModal";

function formatPrice(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function CartDrawer() {
  const {
    items,
    isOpen,
    closeCart,
    updateQuantity,
    removeItem,
    itemsCount,
    subtotal,
  } = useCartStore();

  const { isAuth } = useAuthStore();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

  const count = itemsCount();
  const total = subtotal();

  const handleCheckout = () => {
    if (!isAuth) {
      setShowAuthModal(true);
    } else {
      setShowCheckout(true);
    }
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    setShowCheckout(true);
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(v) => !v && closeCart()}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-[420px] p-0 flex flex-col bg-background"
        >
          {/* Header */}
          <SheetHeader className="px-5 py-4 border-b border-border/50 flex-shrink-0">
            <SheetTitle className="flex items-center gap-2 text-base font-semibold leading-none">
              <ShoppingCart className="h-5 w-5 text-primary" />
              <span>Meu Carrinho</span>
              {count > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">
                  {count}
                </span>
              )}
            </SheetTitle>
          </SheetHeader>

          {/* Lista de itens */}
          {items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
              <div className="rounded-full bg-muted/50 p-6">
                <Music2 className="h-12 w-12 text-muted-foreground/50" />
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  Seu carrinho está vazio
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Adicione produtos para continuar comprando
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={closeCart}
                className="mt-2"
              >
                Continuar Comprando
              </Button>
            </div>
          ) : (
            <>
              <ScrollArea className="flex-1 px-4 py-3">
                <div className="space-y-3">
                  {items.map((item) => (
                    <div
                      key={item.productId}
                      className="flex gap-3 p-3 rounded-xl border border-border/50 bg-card hover:border-primary/20 transition-colors"
                    >
                      {/* Imagem */}
                      <div className="relative h-16 w-16 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                        {item.thumbnail ? (
                          <Image
                            src={item.thumbnail}
                            alt={item.title}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Package className="h-6 w-6 text-muted-foreground/40" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium leading-snug line-clamp-2 text-foreground">
                          {item.title}
                        </p>
                        {item.code && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Cód: {item.code}
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          {/* Controle de quantidade */}
                          <div className="flex items-center gap-1 border border-border/60 rounded-lg overflow-hidden">
                            <button
                              onClick={() =>
                                updateQuantity(item.productId, item.quantity - 1)
                              }
                              className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                              aria-label="Diminuir quantidade"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="text-xs font-semibold w-5 text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                updateQuantity(item.productId, item.quantity + 1)
                              }
                              disabled={item.quantity >= item.availableQuantity}
                              className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40"
                              aria-label="Aumentar quantidade"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>

                          <span className="text-sm font-bold text-primary">
                            {formatPrice(item.price * item.quantity)}
                          </span>
                        </div>
                      </div>

                      {/* Remover */}
                      <button
                        onClick={() => removeItem(item.productId)}
                        className="flex-shrink-0 h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
                        aria-label={`Remover ${item.title}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Footer com resumo e ação */}
              <div className="flex-shrink-0 border-t border-border/50 p-4 space-y-3 bg-card/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Subtotal ({count} {count === 1 ? "item" : "itens"})
                  </span>
                  <span className="text-base font-bold text-foreground">
                    {formatPrice(total)}
                  </span>
                </div>

                <Separator className="opacity-50" />

                <p className="text-xs text-muted-foreground text-center">
                  🚚 Frete calculado no próximo passo
                </p>

                <Button
                  className="w-full h-11 font-semibold text-sm gap-2"
                  onClick={handleCheckout}
                >
                  <ShoppingBag className="h-4 w-4" />
                  Finalizar Pedido
                  <ArrowRight className="h-4 w-4 ml-auto" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground hover:text-foreground"
                  onClick={closeCart}
                >
                  Continuar Comprando
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Modal de autenticação */}
      <CustomerAuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        onSuccess={handleAuthSuccess}
        required
      />

      {/* Modal de checkout do carrinho */}
      {showCheckout && (
        <CartCheckoutModal
          open={showCheckout}
          onOpenChange={setShowCheckout}
        />
      )}
    </>
  );
}
