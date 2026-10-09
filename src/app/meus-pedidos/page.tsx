"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Package,
  Clock,
  CheckCircle2,
  Truck,
  Store,
  ExternalLink,
  RefreshCw,
  Copy,
  Check,
  MessageCircle,
  ShoppingBag,
  LogIn,
  ArrowLeft,
  ChevronRight,
  QrCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/Page-container";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/store/authStore";
import { CustomerAuthModal } from "@/components/site/_components/CustomerAuthModal";
import { OrderStatus, type OrderStatusType } from "@/components/site/_components/OrderStatus";
import { toast } from "sonner";
import { createProductSlug } from "@/lib/slug";

interface OrderItem {
  id: string;
  productId: string;
  title: string;
  price: number;
  quantity: number;
  thumbnail: string | null;
  productCode: string | null;
}

interface CustomerOrder {
  id: string;
  customerName: string;
  customerPhone: string;
  deliveryType: string;
  deliveryAddress: string | null;
  deliveryFee: number;
  totalAmount: number;
  status: OrderStatusType;
  paidAt: string | null;
  createdAt: string;
  mpQrCode: string | null;
  mpQrCodeBase64: string | null;
  uberDeliveryId: string | null;
  uberTrackingUrl: string | null;
  uberCourierName: string | null;
  uberCourierPhone: string | null;
  uberVehicleType: string | null;
  items: OrderItem[];
  product?: {
    id: string;
    title: string;
    thumbnail: string;
    code?: string | null;
  } | null;
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(price);
};

export default function CustomerOrdersPage() {
  const { user, isAuth } = useAuthStore();
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [filterTab, setFilterTab] = useState<"ALL" | "PENDING" | "DELIVERED">("ALL");

  // Pedido selecionado para detalhes/PIX
  const [selectedOrder, setSelectedOrder] = useState<CustomerOrder | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/customer/orders");
      if (res.status === 401) {
        setOrders([]);
        return;
      }
      const data = await res.json();
      if (data.success) {
        setOrders(data.data || []);
      }
    } catch {
      toast.error("Erro ao carregar seus pedidos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuth) {
      fetchOrders();
    } else {
      setLoading(false);
    }
  }, [isAuth, fetchOrders]);

  const handleCopyPix = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Código PIX copiado!");
    setTimeout(() => setCopied(false), 2500);
  };

  const filteredOrders = orders.filter((o) => {
    if (filterTab === "PENDING") {
      return o.status === "PENDING_PAYMENT";
    }
    if (filterTab === "DELIVERED") {
      return o.status === "DELIVERED";
    }
    return true;
  });

  return (
    <div className="min-h-[80vh] py-8 md:py-12">
      <PageContainer className="max-w-4xl mx-auto">
        {/* Voltar para Home / Conta */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/conta"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Minha Conta
          </Link>

          {isAuth && (
            <Button
              variant="outline"
              size="sm"
              onClick={fetchOrders}
              disabled={loading}
              className="h-8 rounded-xl text-xs gap-1.5 border-border"
            >
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          )}
        </div>

        {/* Título Principal estilo Lovable */}
        <div>
          <h1 className="text-3xl font-extrabold md:text-4xl font-display text-foreground">
            Meus Pedidos
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhe seus pedidos de venda local Pink Music. Compras feitas no Mercado Livre são acompanhadas pelo próprio Mercado Livre.
          </p>
        </div>

        {/* Não Autenticado */}
        {!isAuth && !loading && (
          <div className="mt-8 rounded-3xl border border-border/80 bg-card p-8 sm:p-12 text-center max-w-md mx-auto shadow-card">
            <div className="size-16 rounded-2xl bg-secondary text-primary flex items-center justify-center mx-auto mb-4">
              <LogIn className="size-8" />
            </div>
            <h2 className="text-xl font-bold font-display text-foreground">
              Identifique-se para ver seus pedidos
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Entre com sua conta Pink Music para ver o status dos seus pedidos, códigos PIX e entrega.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Button
                onClick={() => setAuthModalOpen(true)}
                className="h-11 rounded-xl font-bold shadow-md"
              >
                Entrar ou Criar Conta
              </Button>
              <Button asChild variant="outline" className="h-11 rounded-xl">
                <Link href="/login">Ir para a página de Login</Link>
              </Button>
            </div>
          </div>
        )}

        {/* Carregando */}
        {loading && (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <RefreshCw className="size-8 animate-spin text-primary" />
            <p className="text-sm">Buscando seus pedidos...</p>
          </div>
        )}

        {/* Autenticado sem pedidos */}
        {isAuth && !loading && orders.length === 0 && (
          <div className="mt-8 rounded-3xl border border-border/80 bg-card p-8 sm:p-12 text-center max-w-md mx-auto shadow-card">
            <div className="size-16 rounded-2xl bg-secondary text-primary flex items-center justify-center mx-auto mb-4">
              <Package className="size-8" />
            </div>
            <h2 className="text-xl font-bold font-display text-foreground">
              Nenhum pedido ainda
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Seus pedidos de venda local na Pink Music aparecerão aqui.
            </p>
            <div className="mt-6">
              <Button asChild className="h-11 rounded-xl font-bold">
                <Link href="/products-all">Explorar produtos</Link>
              </Button>
            </div>
          </div>
        )}

        {/* Lista de Pedidos estilo Lovable */}
        {isAuth && !loading && orders.length > 0 && (
          <div className="mt-6 space-y-4">
            {/* Filtros em Abas */}
            <div className="flex gap-2 p-1 rounded-xl bg-muted/60 border border-border/50 w-fit mb-4">
              <button
                type="button"
                onClick={() => setFilterTab("ALL")}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  filterTab === "ALL"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Todos ({orders.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("PENDING")}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  filterTab === "PENDING"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Aguardando PIX (
                {orders.filter((o) => o.status === "PENDING_PAYMENT").length}
                )
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("DELIVERED")}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  filterTab === "DELIVERED"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Concluídos (
                {orders.filter((o) => o.status === "DELIVERED").length}
                )
              </button>
            </div>

            {/* Cards de Pedidos */}
            <div className="space-y-3">
              {filteredOrders.map((o) => {
                const totalItems =
                  o.items && o.items.length > 0
                    ? o.items.reduce((acc, it) => acc + it.quantity, 0)
                    : 1;

                const itemsSummary =
                  o.items && o.items.length > 0
                    ? o.items.map((i) => i.title).join(", ")
                    : o.product?.title || "Produto Pink Music";

                const isDelivery = o.deliveryType === "delivery";

                return (
                  <div
                    key={o.id}
                    onClick={() => setSelectedOrder(o)}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border/80 bg-card p-5 shadow-card transition-all hover:shadow-lift hover:border-primary/40 cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      {/* Topo do card: ID e status tag */}
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-display text-base sm:text-lg font-bold text-foreground">
                          #{o.id.slice(-8).toUpperCase()}
                        </span>
                        <OrderStatus
                          status={o.status}
                          deliveryType={o.deliveryType}
                          compact
                        />
                      </div>

                      {/* Data e contagem */}
                      <div className="mt-1 text-xs text-muted-foreground">
                        {new Date(o.createdAt).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}{" "}
                        · {totalItems} {totalItems === 1 ? "item" : "itens"}
                      </div>

                      {/* Resumo dos itens */}
                      <div className="mt-1 line-clamp-1 text-sm text-foreground/90 font-medium">
                        {itemsSummary}
                      </div>

                      {/* Método de Entrega */}
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                        {isDelivery ? (
                          <>
                            <Truck className="size-3.5 text-primary" />
                            <span>Entrega Local em Feira de Santana</span>
                          </>
                        ) : (
                          <>
                            <Store className="size-3.5 text-primary" />
                            <span>Retirada no balcão da loja</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Preço e Ação */}
                    <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40 shrink-0">
                      <div className="font-display text-lg sm:text-xl font-bold tabular text-foreground">
                        {formatPrice(o.totalAmount)}
                      </div>
                      <div className="flex items-center gap-1 text-xs font-semibold text-primary">
                        <span>Ver detalhes</span>
                        <ChevronRight className="size-4" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </PageContainer>

      {/* Modal Completo de Acompanhamento do Pedido (estilo pedido.$id.tsx do Lovable) */}
      <Dialog
        open={Boolean(selectedOrder)}
        onOpenChange={(open) => !open && setSelectedOrder(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:p-8">
          {selectedOrder && (
            <div>
              <DialogHeader className="mb-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <DialogTitle className="font-display text-2xl font-bold text-foreground">
                      Pedido #{selectedOrder.id.slice(-8).toUpperCase()}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                      Realizado em{" "}
                      {new Date(selectedOrder.createdAt).toLocaleDateString(
                        "pt-BR",
                        {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </DialogDescription>
                  </div>
                  <OrderStatus
                    status={selectedOrder.status}
                    deliveryType={selectedOrder.deliveryType}
                    compact
                  />
                </div>
              </DialogHeader>

              <div className="space-y-6">
                {/* Seção 1: Status de Pagamento PIX */}
                {selectedOrder.status === "PENDING_PAYMENT" ? (
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 text-center">
                    <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-300 mb-3">
                      <Clock className="size-4" />
                      Aguardando pagamento via PIX
                    </div>
                    <div className="text-xs text-muted-foreground">Valor total</div>
                    <div className="font-display text-3xl sm:text-4xl font-extrabold text-foreground tabular mt-1">
                      {formatPrice(selectedOrder.totalAmount)}
                    </div>

                    {/* QR Code */}
                    {selectedOrder.mpQrCodeBase64 ? (
                      <div className="mx-auto mt-4 size-48 rounded-2xl border border-border bg-white p-3 flex items-center justify-center shadow-xs">
                        <Image
                          src={`data:image/png;base64,${selectedOrder.mpQrCodeBase64}`}
                          alt="QR Code PIX"
                          width={180}
                          height={180}
                          className="size-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="mx-auto mt-4 size-48 rounded-2xl border border-border bg-muted flex items-center justify-center text-muted-foreground">
                        <QrCode className="size-20 opacity-30" />
                      </div>
                    )}

                    <p className="mt-3 text-xs text-muted-foreground max-w-sm mx-auto">
                      Abra o app do seu banco, escolha PIX e escaneie o QR Code — ou use o código Copia e Cola abaixo.
                    </p>

                    {selectedOrder.mpQrCode && (
                      <div className="mt-4">
                        <div className="break-all rounded-xl bg-muted p-2.5 text-left font-mono text-[11px] text-muted-foreground border border-border/50 max-h-20 overflow-y-auto">
                          {selectedOrder.mpQrCode}
                        </div>
                        <Button
                          size="lg"
                          className="mt-3 w-full h-11 rounded-xl text-sm font-bold gap-2"
                          onClick={() => handleCopyPix(selectedOrder.mpQrCode!)}
                        >
                          {copied ? (
                            <>
                              <Check className="size-4" /> Código PIX copiado!
                            </>
                          ) : (
                            <>
                              <Copy className="size-4" /> Copiar código PIX
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center">
                    <CheckCircle2 className="mx-auto size-12 text-emerald-600 dark:text-emerald-400 animate-in zoom-in-50" />
                    <h3 className="mt-2 text-xl font-bold font-display text-foreground">
                      Pagamento Confirmado
                    </h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Obrigado! Já estamos cuidando do seu pedido.
                    </p>
                    <div className="mt-2 font-display text-2xl font-extrabold text-foreground tabular">
                      {formatPrice(selectedOrder.totalAmount)}
                    </div>
                  </div>
                )}

                {/* Seção 2: Linha do Tempo de Acompanhamento */}
                <div className="rounded-2xl border border-border/80 bg-card p-5">
                  <h4 className="font-display text-base font-bold text-foreground mb-4">
                    Etapas do Pedido
                  </h4>
                  <OrderStatus
                    status={selectedOrder.status}
                    deliveryType={selectedOrder.deliveryType}
                  />
                </div>

                {/* Rastreio Uber Direct se houver */}
                {selectedOrder.uberTrackingUrl && (
                  <div className="rounded-2xl border border-purple-500/30 bg-purple-500/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0">
                        {selectedOrder.uberVehicleType === "motorcycle" ? "🛵" : "🚗"}
                      </div>
                      <div>
                        <p className="font-bold text-foreground text-xs">
                          {selectedOrder.uberCourierName
                            ? `Entregador: ${selectedOrder.uberCourierName}`
                            : "Entregador a caminho"}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Acompanhe o trajeto no mapa em tempo real.
                        </p>
                      </div>
                    </div>
                    <Button asChild size="sm" className="rounded-xl text-xs gap-1.5 shrink-0">
                      <a
                        href={selectedOrder.uberTrackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="size-3.5" />
                        Ver no Mapa
                      </a>
                    </Button>
                  </div>
                )}

                {/* Seção 3: Itens do Pedido */}
                <div className="rounded-2xl border border-border/80 bg-card p-5">
                  <h4 className="font-display text-base font-bold text-foreground mb-3">
                    Itens Comprados
                  </h4>
                  <div className="divide-y divide-border/50">
                    {selectedOrder.items && selectedOrder.items.length > 0 ? (
                      selectedOrder.items.map((item) => (
                        <div
                          key={item.id}
                          className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {item.thumbnail ? (
                              <div className="relative size-12 rounded-lg overflow-hidden border border-border shrink-0 bg-muted">
                                <Image
                                  src={item.thumbnail}
                                  alt={item.title}
                                  fill
                                  className="object-contain p-1"
                                />
                              </div>
                            ) : (
                              <div className="size-12 rounded-lg border border-border bg-muted flex items-center justify-center shrink-0">
                                <Package className="size-5 text-muted-foreground" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-semibold text-foreground line-clamp-1">
                                {item.title}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Qtd: {item.quantity} × {formatPrice(item.price)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right text-xs sm:text-sm font-bold text-foreground tabular shrink-0">
                            {formatPrice(item.price * item.quantity)}
                          </div>
                        </div>
                      ))
                    ) : selectedOrder.product ? (
                      <div className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {selectedOrder.product.thumbnail ? (
                            <div className="relative size-12 rounded-lg overflow-hidden border border-border shrink-0 bg-muted">
                              <Image
                                src={selectedOrder.product.thumbnail}
                                alt={selectedOrder.product.title}
                                fill
                                className="object-contain p-1"
                              />
                            </div>
                          ) : (
                            <div className="size-12 rounded-lg border border-border bg-muted flex items-center justify-center shrink-0">
                              <Package className="size-5 text-muted-foreground" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-semibold text-foreground line-clamp-1">
                              {selectedOrder.product.title}
                            </p>
                          </div>
                        </div>
                        <div className="text-right text-xs sm:text-sm font-bold text-foreground tabular shrink-0">
                          {formatPrice(selectedOrder.totalAmount - (selectedOrder.deliveryFee || 0))}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {/* Resumo de Entrega e Frete */}
                  <div className="mt-4 pt-3 border-t border-border/50 text-xs text-muted-foreground space-y-1">
                    {selectedOrder.deliveryFee > 0 && (
                      <div className="flex justify-between">
                        <span>Frete:</span>
                        <span className="font-semibold text-foreground">
                          {formatPrice(selectedOrder.deliveryFee)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-sm text-foreground pt-1">
                      <span>Total do Pedido:</span>
                      <span className="text-primary font-display text-base">
                        {formatPrice(selectedOrder.totalAmount)}
                      </span>
                    </div>

                    <div className="pt-2 text-[11px]">
                      {selectedOrder.deliveryType === "pickup" ? (
                        <span>
                          Retirada na loja: Rua JJ Seabra, 31 - Centro, Feira de Santana, BA
                        </span>
                      ) : (
                        <span>
                          Entrega em: {selectedOrder.deliveryAddress || "Endereço cadastrado"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Ajuda / Dúvidas */}
                <div className="pt-2 flex items-center justify-center">
                  <a
                    href={`https://wa.me/5575999661614?text=${encodeURIComponent(
                      `Olá! Gostaria de falar sobre o meu pedido #${selectedOrder.id.slice(-8).toUpperCase()} na Pink Music.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    <MessageCircle className="size-4" />
                    Dúvidas sobre o pedido? Fale conosco no WhatsApp
                  </a>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de autenticação */}
      <CustomerAuthModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        onSuccess={fetchOrders}
      />
    </div>
  );
}
