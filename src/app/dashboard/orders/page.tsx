"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ClipboardList,
  RefreshCw,
  Store,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  Package,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  MapPin,
  ShoppingCart,
  Mail,
  MessageCircle,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollablePillGroup } from "@/components/ui/scrollable-badges";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type OrderStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "PREPARING"
  | "DISPATCHED"
  | "DELIVERED"
  | "CANCELLED";

export interface OrderItemData {
  id: string;
  productId: string;
  title: string;
  price: number;
  quantity: number;
  thumbnail?: string | null;
  productCode?: string | null;
}

interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  deliveryType: string;
  deliveryAddress: string | null;
  deliveryFee?: number;
  totalAmount: number;
  status: OrderStatus;
  paidAt: string | null;
  uberDeliveryId: string | null;
  uberTrackingUrl: string | null;
  uberCourierName: string | null;
  uberCourierPhone: string | null;
  uberVehicleType: string | null;
  shippingPrice?: number | null;
  shippingCep?: string | null;
  shippingZone?: string | null;
  shippingDistance?: number | null;
  shippingMethod?: string | null;
  createdAt: string;
  product?: {
    id: string;
    title: string;
    thumbnail: string;
    code?: string | null;
  } | null;
  items?: OrderItemData[];
  user?: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
  } | null;
}

interface OrdersMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; color: string; border: string; icon: React.ReactNode }
> = {
  PENDING_PAYMENT: {
    label: "Aguardando PIX",
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    border: "border-l-amber-400",
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  PAID: {
    label: "Pago",
    color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    border: "border-l-emerald-500",
    icon: <CheckCircle className="h-3.5 w-3.5" />,
  },
  PREPARING: {
    label: "Em Preparação",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    border: "border-l-blue-500",
    icon: <Package className="h-3.5 w-3.5" />,
  },
  DISPATCHED: {
    label: "Despachado",
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
    border: "border-l-purple-500",
    icon: <Truck className="h-3.5 w-3.5" />,
  },
  DELIVERED: {
    label: "Entregue",
    color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
    border: "border-l-green-600",
    icon: <CheckCircle className="h-3.5 w-3.5" />,
  },
  CANCELLED: {
    label: "Cancelado",
    color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
    border: "border-l-red-500",
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
};

const ALL_STATUSES: OrderStatus[] = [
  "PENDING_PAYMENT",
  "PAID",
  "PREPARING",
  "DISPATCHED",
  "DELIVERED",
  "CANCELLED",
];

function formatPrice(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [meta, setMeta] = useState<OrdersMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<OrderStatus | "">("");
  const [page, setPage] = useState(1);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Estados do Modal de Despacho de Entrega Local
  const [quoteModalOrder, setQuoteModalOrder] = useState<Order | null>(null);
  const [dispatchCourierName, setDispatchCourierName] = useState("Entregador da Loja");
  const [dispatchCourierPhone, setDispatchCourierPhone] = useState("");
  const [dispatching, setDispatching] = useState(false);

  // Estados do Modal Avisar Motoboy (WhatsApp)
  const [motoboyOrder, setMotoboyOrder] = useState<Order | null>(null);
  const [motoboyPhone, setMotoboyPhone] = useState("");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "15" });
      if (filterStatus) params.set("status", filterStatus);
      const res = await fetch(`/api/orders?${params}`);
      const result = await res.json();
      if (result.success) {
        setOrders(result.data);
        setMeta(result.meta);
      }
    } catch {
      toast.error("Erro ao carregar pedidos.");
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Status atualizado com sucesso.");
        fetchOrders();
      } else {
        toast.error(result.error || "Erro ao atualizar status.");
      }
    } catch {
      toast.error("Erro de conexão.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleOpenDispatchModal = (order: Order) => {
    setQuoteModalOrder(order);
    setDispatchCourierName("Entregador da Loja");
    setDispatchCourierPhone("");
  };

  const handleConfirmDispatch = async () => {
    if (!quoteModalOrder) return;
    setDispatching(true);
    try {
      const res = await fetch(`/api/orders/${quoteModalOrder.id}/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courierName: dispatchCourierName,
          courierPhone: dispatchCourierPhone,
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Pedido despachado para entrega local com sucesso!");
        setQuoteModalOrder(null);
        fetchOrders();
      } else {
        toast.error(result.error || "Erro ao despachar entrega.");
      }
    } catch {
      toast.error("Erro de conexão ao despachar pedido.");
    } finally {
      setDispatching(false);
    }
  };

  const handleSendMotoboyWhatsapp = (order: Order) => {
    const phone = motoboyPhone.replace(/\D/g, "");
    if (!phone || phone.length < 10) {
      toast.error("Informe um número de WhatsApp válido para o motoboy.");
      return;
    }

    const shortId = order.id.slice(-8).toUpperCase();
    const itemsList =
      order.items && order.items.length > 0
        ? order.items
            .map(
              (i) =>
                `  • ${i.quantity}x ${i.title}${i.productCode ? ` [Cód: ${i.productCode}]` : ""}`
            )
            .join("\n")
        : order.product
        ? `  • 1x ${order.product.title}`
        : "  • Produto não especificado";

    const msg = encodeURIComponent(
      `🛵 *Pink Music — Entrega Local*\n\n` +
        `📋 *Pedido:* #${shortId}\n` +
        `👤 *Cliente:* ${order.customerName}\n` +
        `📞 *Tel. Cliente:* ${order.customerPhone}\n\n` +
        `📦 *Itens a entregar:*\n${itemsList}\n\n` +
        `📍 *Endereço de entrega:*\n${order.deliveryAddress || "Não informado"}\n\n` +
        `💰 *Frete combinado:* ${formatPrice(order.deliveryFee || 0)}\n\n` +
        `⚠️ Confirme o recebimento após a entrega. Obrigado!`
    );

    window.open(`https://wa.me/55${phone}?text=${msg}`, "_blank", "noopener,noreferrer");
    setMotoboyOrder(null);
    setMotoboyPhone("");
  };

  return (
    <div className="space-y-6 pt-2 md:pt-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            Pedidos PIX
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {meta ? `${meta.total} pedido(s) encontrado(s)` : "Carregando..."}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={fetchOrders}
          disabled={loading}
          className="flex items-center gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* Filtros de Status */}
      <ScrollablePillGroup
        className="w-full"
        items={[
          {
            label: "Todos",
            active: filterStatus === "",
            onClick: () => { setFilterStatus(""); setPage(1); },
          },
          ...ALL_STATUSES.map((s) => ({
            label: STATUS_CONFIG[s].label,
            active: filterStatus === s,
            onClick: () => { setFilterStatus(s); setPage(1); },
            className:
              filterStatus === s
                ? "bg-primary text-white border-primary"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
          })),
        ]}
      />

      {/* Cards */}
      {loading ? (
        <div className="flex justify-center py-16">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum pedido encontrado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const statusCfg = STATUS_CONFIG[order.status];
            const shortId = order.id.slice(-8).toUpperCase();
            const totalItems = order.items?.reduce((s, i) => s + i.quantity, 0) ?? 0;

            return (
              <div
                key={order.id}
                className={`bg-card border border-border border-l-4 ${statusCfg.border} rounded-xl overflow-hidden shadow-sm`}
              >
                {/* ── Cabeçalho do card ── */}
                <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-muted/30 border-b border-border/50">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusCfg.color}`}
                    >
                      {statusCfg.icon}
                      {statusCfg.label}
                    </span>
                    <span className="font-mono text-xs font-bold text-muted-foreground tracking-wider">
                      #{shortId}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatDate(order.createdAt)}
                  </span>
                </div>

                {/* ── Corpo do card ── */}
                <div className="p-4 space-y-3">

                  {/* Itens do Pedido */}
                  {order.items && order.items.length > 0 ? (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                        <ShoppingCart className="w-3.5 h-3.5" />
                        {totalItems} {totalItems === 1 ? "item" : "itens"} no pedido
                      </p>
                      <div className="rounded-lg border border-border/60 bg-muted/30 divide-y divide-border/40">
                        {order.items.map((item) => {
                          const itemCode = item.productCode ?? order.product?.code ?? null;
                          return (
                            <div
                              key={item.id}
                              className="flex items-center gap-3 px-3 py-2"
                            >
                              {item.thumbnail ? (
                                <div className="relative w-9 h-9 rounded-md overflow-hidden bg-muted border shrink-0">
                                  <Image
                                    src={item.thumbnail}
                                    alt={item.title}
                                    fill
                                    sizes="36px"
                                    className="object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="w-9 h-9 rounded-md bg-muted border flex items-center justify-center shrink-0">
                                  <Package className="w-4 h-4 text-muted-foreground" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-foreground line-clamp-1">
                                  {item.title}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                  {itemCode && (
                                    <span className="font-mono text-[10px] px-1.5 py-px rounded bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                      {itemCode}
                                    </span>
                                  )}
                                  <span className="text-[11px] text-muted-foreground">
                                    Qtd: <strong className="text-foreground">{item.quantity}</strong>
                                  </span>
                                </div>
                              </div>
                              <span className="text-xs font-semibold text-foreground shrink-0">
                                {formatPrice(item.price * item.quantity)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : order.product ? (
                    <div className="flex items-center gap-3">
                      {order.product.thumbnail ? (
                        <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-muted border shrink-0">
                          <Image
                            src={order.product.thumbnail}
                            alt={order.product.title}
                            fill
                            sizes="40px"
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-muted border flex items-center justify-center shrink-0">
                          <Package className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold line-clamp-1">{order.product.title}</p>
                        {order.product.code && (
                          <span className="font-mono text-[10px] px-1.5 py-px rounded bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            {order.product.code}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : null}

                  {/* ── Linha divisória ── */}
                  <div className="border-t border-border/50" />

                  {/* ── Info do cliente + entrega em grid ── */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* Cliente */}
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Cliente
                      </p>
                      <p className="font-semibold text-foreground text-sm">{order.customerName}</p>
                      <a
                        href={`https://wa.me/55${order.customerPhone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 hover:underline"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        {order.customerPhone}
                      </a>
                      {order.user?.email && (
                        <p className="flex items-center gap-1.5 text-muted-foreground">
                          <Mail className="w-3 h-3 shrink-0" />
                          <span className="truncate">{order.user.email}</span>
                        </p>
                      )}
                    </div>

                    {/* Entrega */}
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Modalidade
                      </p>
                      {order.deliveryType === "pickup" ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-medium text-xs">
                          <Store className="h-3.5 w-3.5" />
                          Retirada na loja
                        </div>
                      ) : order.deliveryType === "delivery" ? (
                        <div className="space-y-1">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-300 font-medium text-xs">
                            <Truck className="h-3.5 w-3.5" />
                            Entrega Local
                          </div>
                          {order.deliveryAddress && (
                            <p className="flex items-start gap-1 text-muted-foreground pl-1">
                              <MapPin className="h-3 w-3 mt-0.5 shrink-0 text-purple-500" />
                              <span>{order.deliveryAddress}</span>
                            </p>
                          )}
                          {(order.shippingZone || order.shippingDistance) && (
                            <p className="text-[11px] text-muted-foreground pl-4">
                              {order.shippingZone && (
                                <span className="font-medium text-purple-700 dark:text-purple-400">
                                  [{order.shippingZone}]
                                </span>
                              )}
                              {order.shippingDistance &&
                                ` · ~${order.shippingDistance.toFixed(1)} km`}
                              {` · Frete: ${formatPrice(order.deliveryFee || 0)}`}
                            </p>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* ── Entregador (quando despachado) ── */}
                  {order.status === "DISPATCHED" && order.uberCourierName && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/80 text-xs">
                      <Truck className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                      <span className="font-semibold text-purple-800 dark:text-purple-200">
                        {order.uberCourierName}
                      </span>
                      {order.uberCourierPhone && (
                        <a
                          href={`https://wa.me/55${order.uberCourierPhone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-auto inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 hover:underline"
                        >
                          <MessageCircle className="w-3 h-3" />
                          {order.uberCourierPhone}
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* ── Rodapé: total + ações ── */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-muted/20 border-t border-border/50">
                  {/* Total */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs text-muted-foreground">Total</span>
                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {formatPrice(order.totalAmount)}
                    </span>
                    {order.paidAt && (
                      <span className="text-[10px] text-muted-foreground hidden sm:inline">
                        · Pago {formatDate(order.paidAt)}
                      </span>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* PAID → Preparação */}
                    {order.status === "PAID" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        disabled={updatingId === order.id}
                        onClick={() => handleStatusChange(order.id, "PREPARING")}
                      >
                        <Package className="h-3.5 w-3.5 mr-1" />
                        Em Preparação
                      </Button>
                    )}

                    {/* PREPARING + delivery → Avisar Motoboy via WhatsApp */}
                    {order.status === "PREPARING" && order.deliveryType === "delivery" && (
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-[#25D366] hover:bg-[#1ebe5b] text-white font-medium"
                        onClick={() => {
                          setMotoboyOrder(order);
                          setMotoboyPhone("");
                        }}
                      >
                        <MessageCircle className="h-3.5 w-3.5 mr-1" />
                        Avisar Motoboy
                      </Button>
                    )}

                    {/* PAID ou PREPARING + delivery → Despachar */}
                    {(order.status === "PAID" || order.status === "PREPARING") &&
                      order.deliveryType === "delivery" && (
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white font-medium"
                          disabled={updatingId === order.id || dispatching}
                          onClick={() => handleOpenDispatchModal(order)}
                        >
                          <Truck className="h-3.5 w-3.5 mr-1" />
                          Despachar
                        </Button>
                      )}

                    {/* PREPARING + pickup → Retirado */}
                    {order.status === "PREPARING" && order.deliveryType === "pickup" && (
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white"
                        disabled={updatingId === order.id}
                        onClick={() => handleStatusChange(order.id, "DELIVERED")}
                      >
                        <CheckCircle className="h-3.5 w-3.5 mr-1" />
                        Retirado pelo Cliente
                      </Button>
                    )}

                    {order.uberTrackingUrl && (
                      <a
                        href={order.uberTrackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 h-7 px-2.5 text-xs rounded border border-purple-300 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 transition-colors font-medium"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Rastrear
                      </a>
                    )}

                    {order.status === "PENDING_PAYMENT" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                        disabled={updatingId === order.id}
                        onClick={() => handleStatusChange(order.id, "CANCELLED")}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                        Cancelar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Paginação */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1 || loading}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {page} de {meta.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === meta.totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* ── Modal: Avisar Motoboy via WhatsApp ── */}
      <Dialog
        open={!!motoboyOrder}
        onOpenChange={(open) => !open && setMotoboyOrder(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <MessageCircle className="h-5 w-5 text-[#25D366]" />
              Avisar Motoboy via WhatsApp
            </DialogTitle>
            <DialogDescription className="text-xs">
              {motoboyOrder &&
                `Pedido #${motoboyOrder.id.slice(-8).toUpperCase()} · ${motoboyOrder.customerName}`}
            </DialogDescription>
          </DialogHeader>

          {motoboyOrder && (
            <div className="space-y-4 py-1">
              {/* Preview da entrega */}
              <div className="rounded-lg bg-muted/50 border border-border p-3 text-xs space-y-1.5">
                <p className="flex items-start gap-1.5 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-purple-500" />
                  <span className="font-medium text-foreground">
                    {motoboyOrder.deliveryAddress || "Endereço não informado"}
                  </span>
                </p>
                <p className="text-muted-foreground pl-5">
                  Cliente:{" "}
                  <strong className="text-foreground">{motoboyOrder.customerName}</strong>
                  {" · "}Tel:{" "}
                  <strong className="text-foreground">{motoboyOrder.customerPhone}</strong>
                </p>
                {motoboyOrder.deliveryFee !== undefined && (
                  <p className="text-muted-foreground pl-5">
                    Frete:{" "}
                    <strong className="text-foreground">
                      {formatPrice(motoboyOrder.deliveryFee || 0)}
                    </strong>
                  </p>
                )}
              </div>

              {/* Input WhatsApp do motoboy */}
              <div>
                <Label htmlFor="motoboy-phone" className="text-xs font-semibold">
                  WhatsApp do Motoboy{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="motoboy-phone"
                  placeholder="Ex: 75 99999-0000"
                  value={motoboyPhone}
                  onChange={(e) => setMotoboyPhone(e.target.value)}
                  className="mt-1 text-sm"
                  autoFocus
                  onKeyDown={(e) =>
                    e.key === "Enter" &&
                    motoboyOrder &&
                    handleSendMotoboyWhatsapp(motoboyOrder)
                  }
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  DDD + número, sem código do país.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMotoboyOrder(null)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-[#25D366] hover:bg-[#1ebe5b] text-white font-semibold"
              onClick={() => motoboyOrder && handleSendMotoboyWhatsapp(motoboyOrder)}
            >
              <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
              Abrir WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Despacho Entrega Local ── */}
      <Dialog
        open={!!quoteModalOrder}
        onOpenChange={(open) => !open && !dispatching && setQuoteModalOrder(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <Truck className="h-5 w-5 text-purple-600" />
              Despachar Entrega Local
            </DialogTitle>
            <DialogDescription className="text-xs">
              {quoteModalOrder &&
                `Pedido #${quoteModalOrder.id.slice(-6)} · ${quoteModalOrder.customerName}`}
            </DialogDescription>
          </DialogHeader>

          {quoteModalOrder && (
            <div className="space-y-4 py-2 text-sm">
              {/* Rota */}
              <div className="rounded-lg bg-muted/60 p-3 space-y-2 border border-border text-xs">
                <div className="flex items-start gap-2">
                  <Store className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-foreground">Coleta: Pink Music</p>
                    <p className="text-muted-foreground">
                      Kalilândia / Centro - Feira de Santana, BA
                    </p>
                  </div>
                </div>
                <div className="border-t border-border/60 pt-2 flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-foreground">
                      Destino: {quoteModalOrder.customerName}
                    </p>
                    <p className="text-muted-foreground">
                      {quoteModalOrder.deliveryAddress || "Endereço não informado"}
                    </p>
                    <p className="text-muted-foreground text-[11px] mt-0.5">
                      Tel: {quoteModalOrder.customerPhone}
                    </p>
                  </div>
                </div>
              </div>

              {/* Zona e Frete */}
              <div className="rounded-xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-medium">Zona de Entrega:</span>
                  <span className="font-bold text-purple-800 dark:text-purple-200">
                    {quoteModalOrder.shippingZone || "Zona Local"}
                  </span>
                </div>
                {quoteModalOrder.shippingDistance && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground font-medium">
                      Distância aproximada:
                    </span>
                    <span className="font-semibold text-foreground">
                      ~{quoteModalOrder.shippingDistance.toFixed(1)} km
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-purple-200/60 dark:border-purple-800/60 pt-2">
                  <span className="text-muted-foreground font-medium">
                    Frete Cobrado no Pedido:
                  </span>
                  <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                    {formatPrice(quoteModalOrder.deliveryFee || 0)}
                  </span>
                </div>
              </div>

              {/* Manifesto de Itens */}
              {((quoteModalOrder.items) || []).length > 0 && (
                <div className="rounded-lg bg-muted/50 p-2.5 space-y-1.5 border border-border text-xs">
                  <p className="font-semibold text-foreground flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-primary" />
                    Itens a entregar (
                    {quoteModalOrder.items!.reduce((acc, i) => acc + i.quantity, 0)}):
                  </p>
                  <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                    {quoteModalOrder.items!.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between text-muted-foreground gap-2"
                      >
                        <span className="line-clamp-1">
                          <strong className="text-foreground">{item.quantity}x</strong>{" "}
                          {item.title}
                        </span>
                        {item.productCode && (
                          <span className="font-mono text-[10px] shrink-0 px-1 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            {item.productCode}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dados do Entregador */}
              <div className="space-y-2 pt-1 border-t">
                <div>
                  <Label htmlFor="courier-name" className="text-xs">
                    Nome do Entregador / Motoboy
                  </Label>
                  <Input
                    id="courier-name"
                    placeholder="Ex: Carlos (Motoboy da Loja)"
                    value={dispatchCourierName}
                    onChange={(e) => setDispatchCourierName(e.target.value)}
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label htmlFor="courier-phone" className="text-xs">
                    Telefone / WhatsApp do Entregador (Opcional)
                  </Label>
                  <Input
                    id="courier-phone"
                    placeholder="Ex: (75) 98888-7777"
                    value={dispatchCourierPhone}
                    onChange={(e) => setDispatchCourierPhone(e.target.value)}
                    className="mt-1 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              disabled={dispatching}
              onClick={() => setQuoteModalOrder(null)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white font-medium"
              disabled={dispatching}
              onClick={handleConfirmDispatch}
            >
              {dispatching ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Despachando...
                </>
              ) : (
                <>
                  <Truck className="h-3.5 w-3.5 mr-1.5" />
                  Confirmar Despacho
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
