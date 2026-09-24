"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Package,
  Clock,
  CheckCircle,
  Truck,
  Store,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  QrCode,
  Copy,
  Check,
  MessageCircle,
  ShoppingBag,
  LogIn,
  ArrowLeft,
  XCircle,
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
import { toast } from "sonner";

type OrderStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "PREPARING"
  | "DISPATCHED"
  | "DELIVERED"
  | "CANCELLED";

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
  status: OrderStatus;
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

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; badgeClass: string; icon: React.ReactNode; description: string }
> = {
  PENDING_PAYMENT: {
    label: "Aguardando PIX",
    badgeClass:
      "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800",
    icon: <Clock className="h-3.5 w-3.5" />,
    description: "Realize o pagamento do PIX para confirmarmos seu pedido.",
  },
  PAID: {
    label: "Pagamento Confirmado",
    badgeClass:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800",
    icon: <CheckCircle className="h-3.5 w-3.5" />,
    description: "Pagamento recebido com sucesso! Estamos processando o pedido.",
  },
  PREPARING: {
    label: "Em Preparação",
    badgeClass:
      "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-800",
    icon: <Package className="h-3.5 w-3.5" />,
    description: "Seus produtos estão sendo separados e embalados na loja.",
  },
  DISPATCHED: {
    label: "A Caminho / Despachado",
    badgeClass:
      "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300 dark:border-purple-800",
    icon: <Truck className="h-3.5 w-3.5" />,
    description: "O entregador Uber Direct já retirou seu pacote e está a caminho!",
  },
  DELIVERED: {
    label: "Entregue / Retirado",
    badgeClass:
      "bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300 border-green-300 dark:border-green-800",
    icon: <Check className="h-3.5 w-3.5" />,
    description: "Pedido entregue com sucesso. Aproveite sua música!",
  },
  CANCELLED: {
    label: "Cancelado",
    badgeClass:
      "bg-gray-100 text-gray-700 dark:bg-gray-900/60 dark:text-gray-400 border-gray-300 dark:border-gray-700",
    icon: <XCircle className="h-3.5 w-3.5" />,
    description: "Este pedido foi cancelado.",
  },
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CustomerOrdersPage() {
  const { user, isAuth } = useAuthStore();
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [filterTab, setFilterTab] = useState<"ALL" | "PENDING" | "DELIVERED">("ALL");

  // Modal para ver PIX pendente
  const [pixModalOrder, setPixModalOrder] = useState<CustomerOrder | null>(null);
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
    toast.success("Código PIX copiado para a área de transferência!");
    setTimeout(() => setCopied(false), 3000);
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
    <div className="min-h-[75vh] py-8 md:py-12 bg-muted/20">
      <PageContainer>
        {/* Navegação de volta */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar para a Loja
          </Link>
          {isAuth && (
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchOrders}
              disabled={loading}
              className="h-8 text-xs gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          )}
        </div>

        {/* Cabeçalho da Página */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2.5">
                <Package className="h-7 w-7 text-primary" />
                Meus Pedidos
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {isAuth && user
                  ? `Olá, ${user.name}! Acompanhe aqui o andamento de todas as suas compras.`
                  : "Acesse sua conta para visualizar e acompanhar seus pedidos."}
              </p>
            </div>

            {/* Badges de resumo se logado */}
            {isAuth && orders.length > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <div className="px-3 py-1.5 rounded-lg bg-card border border-border text-foreground">
                  Total: <strong>{orders.length}</strong>
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300">
                  Pagos: <strong>{orders.filter((o) => o.status !== "PENDING_PAYMENT" && o.status !== "CANCELLED").length}</strong>
                </div>
              </div>
            )}
          </div>

          {/* Abas de filtro quando logado */}
          {isAuth && orders.length > 0 && (
            <div className="flex items-center gap-2 mt-4">
              <button
                type="button"
                onClick={() => setFilterTab("ALL")}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  filterTab === "ALL"
                    ? "bg-primary text-white"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                Todos ({orders.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("PENDING")}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  filterTab === "PENDING"
                    ? "bg-amber-600 text-white"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                Aguardando Pagamento ({orders.filter((o) => o.status === "PENDING_PAYMENT").length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("DELIVERED")}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  filterTab === "DELIVERED"
                    ? "bg-emerald-600 text-white"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                Concluídos ({orders.filter((o) => o.status === "DELIVERED").length})
              </button>
            </div>
          )}
        </div>

        {/* Estado: Não Autenticado */}
        {!isAuth && !loading && (
          <div className="max-w-md mx-auto text-center py-16 px-6 bg-card border border-border rounded-2xl shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
              <LogIn className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Identifique-se para ver seus pedidos</h2>
            <p className="text-sm text-muted-foreground mt-2 mb-6">
              Entre com sua conta da Pink Music para ver o histórico das suas compras, códigos PIX e links de rastreamento Uber Direct.
            </p>
            <Button
              onClick={() => setAuthModalOpen(true)}
              className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-5"
            >
              <LogIn className="h-4 w-4 mr-2" />
              Entrar ou Criar Conta
            </Button>
          </div>
        )}

        {/* Estado: Carregando */}
        {loading && (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <RefreshCw className="h-7 w-7 animate-spin text-primary" />
            <p className="text-sm">Buscando seus pedidos...</p>
          </div>
        )}

        {/* Estado: Autenticado mas sem pedidos */}
        {isAuth && !loading && orders.length === 0 && (
          <div className="max-w-md mx-auto text-center py-16 px-6 bg-card border border-border rounded-2xl shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4 text-muted-foreground">
              <ShoppingBag className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Nenhum pedido encontrado</h2>
            <p className="text-sm text-muted-foreground mt-2 mb-6">
              Você ainda não realizou compras com esta conta. Que tal conferir nossos instrumentos e novidades?
            </p>
            <Button asChild className="bg-primary hover:bg-primary/90 text-white font-semibold">
              <Link href="/products-all">
                Explorar Produtos
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        )}

        {/* Lista de Pedidos */}
        {isAuth && !loading && filteredOrders.length > 0 && (
          <div className="space-y-5">
            {filteredOrders.map((order) => {
              const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING_PAYMENT;
              const itemsCount =
                order.items && order.items.length > 0
                  ? order.items.reduce((s, i) => s + i.quantity, 0)
                  : 1;

              return (
                <div
                  key={order.id}
                  className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Cabeçalho do Card */}
                  <div className="bg-muted/40 p-4 sm:px-6 flex flex-wrap items-center justify-between gap-3 border-b border-border/60">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-md bg-background border border-border">
                        #{order.id.slice(-8).toUpperCase()}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Realizado em {formatDate(order.createdAt)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusCfg.badgeClass}`}
                      >
                        {statusCfg.icon}
                        {statusCfg.label}
                      </span>
                    </div>
                  </div>

                  {/* Corpo do Pedido */}
                  <div className="p-4 sm:p-6 space-y-5">
                    {/* Alerta explicativo do status */}
                    <p className="text-xs text-muted-foreground">{statusCfg.description}</p>

                    {/* Lista de Itens do Pedido */}
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
                        {itemsCount === 1 ? "Produto" : `Itens do Pacote (${itemsCount})`}
                      </p>

                      {order.items && order.items.length > 0 ? (
                        <div className="space-y-2.5">
                          {order.items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between gap-4 p-2.5 rounded-xl bg-muted/20 border border-border/40 text-xs"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                {item.thumbnail ? (
                                  <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-muted border shrink-0">
                                    <Image
                                      src={item.thumbnail}
                                      alt={item.title}
                                      fill
                                      sizes="48px"
                                      className="object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className="w-12 h-12 rounded-lg bg-muted border flex items-center justify-center shrink-0">
                                    <Package className="w-5 h-5 text-muted-foreground" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <Link
                                    href={`/products/${item.productId}`}
                                    className="font-medium text-foreground hover:text-primary transition-colors line-clamp-1 text-sm"
                                  >
                                    {item.title}
                                  </Link>
                                  <div className="flex items-center gap-2 text-muted-foreground mt-0.5">
                                    {item.productCode && (
                                      <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                        Cód: {item.productCode}
                                      </span>
                                    )}
                                    <span>
                                      Qtd: <strong className="text-foreground">{item.quantity}</strong>
                                    </span>
                                    <span>·</span>
                                    <span>{formatPrice(item.price)} cada</span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="font-bold text-foreground text-sm">
                                  {formatPrice(item.price * item.quantity)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : order.product ? (
                        /* Legado produto único */
                        <div className="flex items-center justify-between gap-4 p-2.5 rounded-xl bg-muted/20 border border-border/40 text-xs">
                          <div className="flex items-center gap-3 min-w-0">
                            {order.product.thumbnail ? (
                              <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-muted border shrink-0">
                                <Image
                                  src={order.product.thumbnail}
                                  alt={order.product.title}
                                  fill
                                  sizes="48px"
                                  className="object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-muted border flex items-center justify-center shrink-0">
                                <Package className="w-5 h-5 text-muted-foreground" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <Link
                                href={`/products/${order.product.id}`}
                                className="font-medium text-foreground hover:text-primary transition-colors line-clamp-1 text-sm"
                              >
                                {order.product.title}
                              </Link>
                              {order.product.code && (
                                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 mt-1 inline-block">
                                  Cód: {order.product.code}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-bold text-foreground text-sm">
                              {formatPrice(order.totalAmount)}
                            </span>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {/* Detalhes de Logística / Entrega */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-border/50 text-xs">
                      <div className="space-y-1">
                        <span className="text-muted-foreground font-semibold">Forma de Recebimento</span>
                        {order.deliveryType === "pickup" ? (
                          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/70 text-amber-900 dark:text-amber-200">
                            <Store className="h-4 w-4 shrink-0 mt-0.5 text-amber-700 dark:text-amber-400" />
                            <div>
                              <p className="font-semibold">Retirada na Loja Física</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                Rua JJ Seabra, 31 - Centro, Feira de Santana, BA
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/70 dark:border-purple-800/70 text-purple-900 dark:text-purple-200">
                            <Truck className="h-4 w-4 shrink-0 mt-0.5 text-purple-600 dark:text-purple-400" />
                            <div>
                              <p className="font-semibold">Entrega Local (Uber Direct)</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                {order.deliveryAddress || "Endereço registrado no pedido"}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Resumo Financeiro */}
                      <div className="space-y-1 md:text-right">
                        <span className="text-muted-foreground font-semibold">Resumo do Pedido</span>
                        <div className="p-2.5 rounded-lg bg-muted/30 border border-border/50 space-y-1">
                          {order.deliveryFee > 0 && (
                            <div className="flex items-center justify-between text-muted-foreground">
                              <span>Frete:</span>
                              <span>{formatPrice(order.deliveryFee)}</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between font-bold text-foreground text-sm pt-0.5">
                            <span>Total Geral:</span>
                            <span className="text-emerald-600 dark:text-emerald-400">
                              {formatPrice(order.totalAmount)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Destaque Uber Direct: Rastreio em Tempo Real quando despachado */}
                    {order.uberTrackingUrl && (
                      <div className="p-3.5 rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/40 dark:to-indigo-950/40 border border-purple-200 dark:border-purple-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0">
                            {order.uberVehicleType === "motorcycle" ? "🛵" : "🚗"}
                          </div>
                          <div>
                            <p className="font-semibold text-purple-950 dark:text-purple-100 text-xs">
                              {order.uberCourierName
                                ? `Entregador(a): ${order.uberCourierName}`
                                : "Entregador Uber a caminho"}
                            </p>
                            <p className="text-[11px] text-purple-700/80 dark:text-purple-300/80">
                              Acompanhe o mapa e a localização exata do seu pedido em tempo real.
                            </p>
                          </div>
                        </div>
                        <a
                          href={order.uberTrackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-sm transition-colors shrink-0"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Rastrear no Mapa Uber
                        </a>
                      </div>
                    )}

                    {/* Barra de Ações do Pedido */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/50">
                      {/* Ação primária se PIX pendente */}
                      {order.status === "PENDING_PAYMENT" && order.mpQrCode && (
                        <Button
                          size="sm"
                          onClick={() => setPixModalOrder(order)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5"
                        >
                          <QrCode className="h-4 w-4" />
                          Pagar Agora via PIX
                        </Button>
                      )}

                      {/* Botão de ajuda via WhatsApp da loja */}
                      <a
                        href={`https://wa.me/5575991988685?text=${encodeURIComponent(
                          `Olá! Gostaria de informações sobre o meu pedido #${order.id.slice(-8).toUpperCase()} na Pink Music.`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors ml-auto"
                      >
                        <MessageCircle className="h-3.5 w-3.5 text-emerald-500" />
                        Dúvidas sobre o pedido? Fale conosco
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </PageContainer>

      {/* Modal de Autenticação */}
      <CustomerAuthModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        onSuccess={() => {
          setAuthModalOpen(false);
          fetchOrders();
        }}
      />

      {/* Modal de Pagamento PIX Pendente */}
      <Dialog
        open={!!pixModalOrder}
        onOpenChange={(open) => !open && setPixModalOrder(null)}
      >
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2 text-base font-bold">
              <QrCode className="h-5 w-5 text-emerald-600" />
              Pagamento via PIX
            </DialogTitle>
            <DialogDescription className="text-xs">
              {pixModalOrder && `Pedido #${pixModalOrder.id.slice(-8).toUpperCase()}`}
            </DialogDescription>
          </DialogHeader>

          {pixModalOrder && (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                <p className="text-xs text-muted-foreground">Valor a pagar</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatPrice(pixModalOrder.totalAmount)}
                </p>
              </div>

              {/* QR Code Imagem */}
              {pixModalOrder.mpQrCodeBase64 ? (
                <div className="flex justify-center my-2">
                  <div className="p-3 bg-white rounded-xl border shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`data:image/png;base64,${pixModalOrder.mpQrCodeBase64}`}
                      alt="QR Code PIX"
                      className="w-48 h-48 mx-auto"
                    />
                  </div>
                </div>
              ) : null}

              {/* Código Copia e Cola */}
              {pixModalOrder.mpQrCode && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Ou copie a chave PIX Copia e Cola:</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={pixModalOrder.mpQrCode}
                      className="w-full text-xs font-mono bg-muted p-2 rounded-lg border truncate"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleCopyPix(pixModalOrder.mpQrCode!)}
                      className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
