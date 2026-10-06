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
  { label: string; color: string; icon: React.ReactNode }
> = {
  PENDING_PAYMENT: {
    label: "Aguardando PIX",
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  PAID: {
    label: "Pago",
    color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    icon: <CheckCircle className="h-3.5 w-3.5" />,
  },
  PREPARING: {
    label: "Em Preparação",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    icon: <Package className="h-3.5 w-3.5" />,
  },
  DISPATCHED: {
    label: "Despachado",
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
    icon: <Truck className="h-3.5 w-3.5" />,
  },
  DELIVERED: {
    label: "Entregue",
    color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
    icon: <CheckCircle className="h-3.5 w-3.5" />,
  },
  CANCELLED: {
    label: "Cancelado",
    color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
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

      {/* Tabela */}
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
            return (
              <div
                key={order.id}
                className="bg-card border border-border rounded-xl p-4 space-y-3"
              >
                {/* Linha 1: status + data */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusCfg.color}`}
                  >
                    {statusCfg.icon}
                    {statusCfg.label}
                  </span>
                  <span className="text-xs text-secondary-foreground/90">
                    {formatDate(order.createdAt)}
                  </span>
                </div>

                {/* Linha 2: produtos + dados + valor */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-3">
                    {/* Itens do Pedido (Novo fluxo com carrinho) */}
                    {order.items && order.items.length > 0 ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary flex items-center gap-1.5">
                            <ShoppingCart className="w-3.5 h-3.5" />
                            {order.items.reduce((s, i) => s + i.quantity, 0)}{" "}
                            {order.items.reduce((s, i) => s + i.quantity, 0) === 1
                              ? "item"
                              : "itens"}{" "}
                            no pedido
                          </span>
                        </div>
                        <div className="space-y-2 bg-muted/40 rounded-lg p-2.5 border border-border/60">
                          {order.items.map((item) => {
                            const itemCode = item.productCode ?? order.product?.code ?? null;

                            return (
                              <div
                                key={item.id}
                                className="flex items-center justify-between gap-3 text-xs"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
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
                                  <div className="min-w-0">
                                    <p className="font-medium text-foreground text-xs line-clamp-1">
                                      {item.title}
                                    </p>
                                    <div className="flex gap-1.5 text-[11px] text-secondary-foreground/90 flex-wrap">
                                      {itemCode && (
                                        <span className="text-[11px] py-0.2 rounded text-secondary-foreground">
                                          Cód: {itemCode}
                                        </span>
                                      )}
                                      <span>
                                        Qtd:{" "}
                                        <strong className="text-foreground">
                                          {item.quantity}
                                        </strong>
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="font-semibold text-foreground">
                                    {formatPrice(item.price * item.quantity)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : order.product ? (
                      /* Fluxo legado de produto único */
                      <div className="flex items-center gap-2.5">
                        {order.product.thumbnail ? (
                          <div className="relative w-9 h-9 rounded-md overflow-hidden bg-muted border shrink-0">
                            <Image
                              src={order.product.thumbnail}
                              alt={order.product.title}
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
                        <div className="min-w-0">
                          <p className="font-semibold text-sm line-clamp-1">
                            {order.product.title}
                          </p>
                          {order.product.code && (
                            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                Cód: {order.product.code}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm font-medium text-muted-foreground">
                        Produto não especificado
                      </p>
                    )}

                    {/* Dados do Cliente e Tipo de Entrega */}
                    <div className="space-y-1.5 pt-1 text-xs">
                      <div className="flex flex-wrap flex-col gap-1 text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <p className="text-secondary-foreground/80">Cliente:{" "}</p>
                          <strong className="text-foreground">
                            {order.customerName}
                          </strong>
                        </span>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-secondary-foreground/80">
                            <a
                              href={`https://wa.me/55${order.customerPhone.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px]"
                              title="Conversar no WhatsApp"
                            >
                              <MessageCircle className="w-3 h-3" />
                              {order.customerPhone}
                            </a>
                          </span>
                          <div className="text-secondary-foreground/80">
                            {order.user && (
                              <span className="inline-flex items-center gap-1 text-[11px] ">
                                <Mail className="w-3 h-3" />
                                {order.user.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-secondary-foreground">
                        {order.deliveryType === "pickup" ? (
                          <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-medium">
                            <Store className="h-3.5 w-3.5" />
                            Retirada na loja
                          </span>
                        ) : order.deliveryType === "delivery" ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1.5 font-medium text-purple-700 dark:text-purple-300">
                              <Truck className="h-3.5 w-3.5" />
                              Entrega Local: {order.deliveryAddress || "Não informado"}
                            </span>
                            {(order.shippingZone || order.shippingDistance) && (
                              <p className="text-[11px] text-muted-foreground pl-5">
                                {order.shippingZone ? `[${order.shippingZone}] ` : ""}
                                {order.shippingDistance ? `Distância: ~${order.shippingDistance.toFixed(1)} km · ` : ""}
                                Frete cobrado: {formatPrice(order.deliveryFee || 0)}
                              </p>
                            )}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* Dados do Entregador / Despacho Local */}
                    {order.status === "DISPATCHED" && (
                      <div className="mt-2 p-2 rounded-lg bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/80 text-xs space-y-1">
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <span className="font-semibold text-purple-800 dark:text-purple-200 flex items-center gap-1.5">
                            <Truck className="h-3.5 w-3.5 text-purple-600" />
                            <span>Entregador / Rota:</span>
                            <span className="font-normal text-foreground">
                              {order.uberCourierName || "Entregador da Loja"}
                            </span>
                          </span>
                          {order.uberCourierPhone && (
                            <span className="text-[11px] text-muted-foreground">
                              Tel: <strong className="text-foreground">{order.uberCourierPhone}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    {/* ID do pedido */}
                    <p className="text-[11px] text-secondary-foreground/90">
                      <span className="font-semibold">Pedido:</span> {order.id}
                    </p>
                  </div>

                  <div className="text-right shrink-0 pt-1 md:pt-0">
                    <p className="text-xs text-muted-foreground font-medium">Total</p>
                    <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                      {formatPrice(order.totalAmount)}
                    </p>
                    {order.paidAt && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Pago {formatDate(order.paidAt)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Ações */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {order.status === "PAID" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      disabled={updatingId === order.id}
                      onClick={() => handleStatusChange(order.id, "PREPARING")}
                    >
                      <Package className="h-3.5 w-3.5 mr-1" />
                      Marcar Em Preparação
                    </Button>
                  )}
                  {/* Botão de despacho Entrega Local */}
                  {(order.status === "PAID" || order.status === "PREPARING") &&
                    order.deliveryType === "delivery" && (
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white font-medium"
                        disabled={updatingId === order.id || dispatching}
                        onClick={() => handleOpenDispatchModal(order)}
                      >
                        <Truck className="h-3.5 w-3.5 mr-1" />
                        Despachar Entrega Local
                      </Button>
                    )}
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
                      Rastrear Uber em Tempo Real
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
            );
          })}
        </div>
      )
      }

      {/* Paginação */}
      {
        meta && meta.totalPages > 1 && (
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
        )
      }

      {/* Modal de Despacho Entrega Local */}
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

              {/* Informações da Zona e Frete Gravadas no Pedido */}
              <div className="rounded-xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-medium">Zona de Entrega:</span>
                  <span className="font-bold text-purple-800 dark:text-purple-200">
                    {quoteModalOrder.shippingZone || "Zona Local"}
                  </span>
                </div>
                {quoteModalOrder.shippingDistance && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground font-medium">Distância aproximada:</span>
                    <span className="font-semibold text-foreground">
                      ~{quoteModalOrder.shippingDistance.toFixed(1)} km
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-purple-200/60 dark:border-purple-800/60 pt-2">
                  <span className="text-muted-foreground font-medium">Frete Cobrado no Pedido:</span>
                  <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                    {formatPrice(quoteModalOrder.deliveryFee || 0)}
                  </span>
                </div>
              </div>

              {/* Manifesto de Itens a Coletar (quando múltiplos itens) */}
              {((quoteModalOrder.items) || []).length > 0 && (
                <div className="rounded-lg bg-muted/50 p-2.5 space-y-1.5 border border-border text-xs">
                  <p className="font-semibold text-foreground flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-primary" />
                    Itens a entregar ({quoteModalOrder.items!.reduce((acc, i) => acc + i.quantity, 0)}):
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
                          <span className="font-mono text-[10px] shrink-0 px-1 py-0.2 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            Cód: {item.productCode}
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

