"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
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
  ChevronDown,
  ChevronUp,
  List,
  LayoutGrid,
  ExternalLink,
  Loader2,
  MapPin,
  ShoppingCart,
  Mail,
  MessageCircle,
  Bike,
  DollarSign,
  Printer,
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
  discountAmount?: number;
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
  needsReview?: boolean;
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
  const [couriersList, setCouriersList] = useState<
    Array<{ id: string; name: string; phone: string; vehicle: string | null; plate: string | null }>
  >([]);
  const [selectedCourierId, setSelectedCourierId] = useState<string>("");
  const [dispatchCourierName, setDispatchCourierName] = useState("Entregador da Loja");
  const [dispatchCourierPhone, setDispatchCourierPhone] = useState("");
  const [dispatchCourierFee, setDispatchCourierFee] = useState<number>(0);
  const [dispatchNotes, setDispatchNotes] = useState<string>("");
  const [dispatching, setDispatching] = useState(false);

  // Estados do Modal Avisar Motoboy (WhatsApp)
  const [motoboyOrder, setMotoboyOrder] = useState<Order | null>(null);
  const [motoboyPhone, setMotoboyPhone] = useState("");

  // Carregar motoboys ativos
  useEffect(() => {
    async function loadCouriers() {
      try {
        const res = await fetch("/api/couriers?active=true");
        const json = await res.json();
        if (res.ok && json.success) {
          setCouriersList(json.data);
        }
      } catch (err) {
        console.error("Erro ao carregar motoboys:", err);
      }
    }
    loadCouriers();
  }, []);

  // Modo de visualização: inteligente por status ou forçado pelo usuário
  const [viewModeOverride, setViewModeOverride] = useState<"compact" | "cards" | null>(null);
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(new Set());

  const toggleExpandOrder = (orderId: string) => {
    setExpandedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  // Status operacionais ativos demandam cards detalhados por padrão
  const isActiveOperationalStatus =
    filterStatus === "PENDING_PAYMENT" ||
    filterStatus === "PAID" ||
    filterStatus === "PREPARING" ||
    filterStatus === "DISPATCHED";

  const effectiveViewMode =
    viewModeOverride !== null
      ? viewModeOverride
      : isActiveOperationalStatus
      ? "cards"
      : "compact";

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
    const suggestedFee = order.deliveryFee || order.shippingPrice || 0;
    setDispatchCourierFee(suggestedFee);
    setDispatchNotes("");

    // Se temos motoboys cadastrados, seleciona o primeiro por padrão
    if (couriersList.length > 0) {
      const first = couriersList[0];
      setSelectedCourierId(first.id);
      setDispatchCourierName(first.name);
      setDispatchCourierPhone(first.phone);
    } else {
      setSelectedCourierId("");
      setDispatchCourierName("Entregador da Loja");
      setDispatchCourierPhone("");
    }
  };

  const handleSelectCourierChange = (courierId: string) => {
    setSelectedCourierId(courierId);
    if (!courierId) {
      setDispatchCourierName("Entregador Avulso");
      setDispatchCourierPhone("");
      return;
    }
    const found = couriersList.find((c) => c.id === courierId);
    if (found) {
      setDispatchCourierName(found.name);
      setDispatchCourierPhone(found.phone);
    }
  };

  const handleConfirmDispatch = async (openWhatsApp = false) => {
    if (!quoteModalOrder) return;
    setDispatching(true);
    try {
      const res = await fetch(`/api/orders/${quoteModalOrder.id}/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courierId: selectedCourierId || undefined,
          courierName: dispatchCourierName,
          courierPhone: dispatchCourierPhone,
          courierFee: dispatchCourierFee,
          notes: dispatchNotes,
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Pedido despachado e corrida atrelada ao motoboy com sucesso!");

        // Se solicitado, dispara o WhatsApp com a rota e dados do pedido
        if (openWhatsApp && dispatchCourierPhone) {
          const shortId = quoteModalOrder.id.slice(-8).toUpperCase();
          const itemsList =
            quoteModalOrder.items && quoteModalOrder.items.length > 0
              ? quoteModalOrder.items
                  .map((i) => `  • ${i.quantity}x ${i.title}${i.productCode ? ` [Cód: ${i.productCode}]` : ""}`)
                  .join("\n")
              : "  • Produto";

          const msg = encodeURIComponent(
            `🛵 *Pink Music — Nova Entrega Atribuída*\n\n` +
            `📋 *Pedido:* #${shortId}\n` +
            `👤 *Cliente:* ${quoteModalOrder.customerName}\n` +
            `📞 *Tel. Cliente:* ${quoteModalOrder.customerPhone}\n\n` +
            `📦 *Itens a entregar:*\n${itemsList}\n\n` +
            `📍 *Endereço de entrega:*\n${quoteModalOrder.deliveryAddress || "Não informado"}\n\n` +
            `💰 *Valor da corrida a receber:* ${formatPrice(dispatchCourierFee)}\n\n` +
            (dispatchNotes ? `📝 *Observação:* ${dispatchNotes}\n\n` : "") +
            `⚠️ Bom trabalho e pilote com cuidado!`
          );

          const cleanPhone = dispatchCourierPhone.replace(/\D/g, "");
          window.open(`https://wa.me/55${cleanPhone}?text=${msg}`, "_blank");
        }

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

  const renderOrderActions = (order: Order, isCompact = false) => {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {/* PENDING_PAYMENT → Confirmar Pagamento */}
        {order.status === "PENDING_PAYMENT" && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 font-medium cursor-pointer"
            disabled={updatingId === order.id}
            onClick={() => handleStatusChange(order.id, "PAID")}
          >
            <CheckCircle className="h-3.5 w-3.5 mr-1" />
            {isCompact ? "Confirmar Pag." : "Confirmar Pagamento"}
          </Button>
        )}

        {/* PAID → Preparação */}
        {order.status === "PAID" && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs cursor-pointer"
            disabled={updatingId === order.id}
            onClick={() => handleStatusChange(order.id, "PREPARING")}
          >
            <Package className="h-3.5 w-3.5 mr-1" />
            {isCompact ? "Preparar" : "Em Preparação"}
          </Button>
        )}

        {/* PREPARING + delivery → Avisar Motoboy via WhatsApp */}
        {order.status === "PREPARING" && order.deliveryType === "delivery" && (
          <Button
            size="sm"
            className="h-7 text-xs bg-[#25D366] hover:bg-[#1ebe5b] text-white font-medium cursor-pointer"
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
              className="h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white font-medium cursor-pointer"
              disabled={updatingId === order.id || dispatching}
              onClick={() => handleOpenDispatchModal(order)}
            >
              <Truck className="h-3.5 w-3.5 mr-1" />
              Despachar
            </Button>
          )}

        {/* PAID ou PREPARING + pickup → Pronto para Retirada (DISPATCHED) */}
        {(order.status === "PAID" || order.status === "PREPARING") &&
          order.deliveryType === "pickup" && (
            <Button
              size="sm"
              className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white font-medium cursor-pointer"
              disabled={updatingId === order.id}
              onClick={() => handleStatusChange(order.id, "DISPATCHED")}
            >
              <Store className="h-3.5 w-3.5 mr-1" />
              Pronto p/ Retirada
            </Button>
          )}

        {/* PREPARING + pickup → Retirado Direto no balcão */}
        {order.status === "PREPARING" && order.deliveryType === "pickup" && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-green-500/30 text-green-600 hover:bg-green-500/10 font-medium cursor-pointer"
            disabled={updatingId === order.id}
            onClick={() => handleStatusChange(order.id, "DELIVERED")}
          >
            <CheckCircle className="h-3.5 w-3.5 mr-1" />
            {isCompact ? "Retirado" : "Retirado pelo Cliente"}
          </Button>
        )}

        {/* DISPATCHED (Delivery ou Pickup) → Confirmar Entrega / Retirada */}
        {order.status === "DISPATCHED" && (
          <Button
            size="sm"
            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium cursor-pointer"
            disabled={updatingId === order.id}
            onClick={() => handleStatusChange(order.id, "DELIVERED")}
          >
            <CheckCircle className="h-3.5 w-3.5 mr-1" />
            {order.deliveryType === "pickup" ? "Confirmar Retirada" : "Confirmar Entrega"}
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
            className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer"
            disabled={updatingId === order.id}
            onClick={() => handleStatusChange(order.id, "CANCELLED")}
          >
            <XCircle className="h-3.5 w-3.5 mr-1" />
            Cancelar
          </Button>
        )}
      </div>
    );
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
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <Link href="/dashboard/orders/report">
            <Button
              variant="outline"
              className="gap-2 border-purple-500/30 text-purple-600 hover:bg-purple-50 hover:text-purple-700 dark:hover:bg-purple-950/40"
              title="Acessar Relatório de Vendas completo e exportação em PDF"
            >
              <Printer className="h-4 w-4" />
              <span>Relatório de Vendas / PDF</span>
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={fetchOrders}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
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

      {/* Barra de controle de visualização e densidade */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/40 p-2.5 rounded-2xl border border-border/50">
        <div className="flex items-center gap-2 text-xs text-muted-foreground pl-1">
          <span>Modo de visualização:</span>
          <span className="font-semibold text-foreground">
            {effectiveViewMode === "compact" ? "Lista Compacta" : "Cards Detalhados"}
          </span>
          {viewModeOverride === null ? (
            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
              Automático por status
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setViewModeOverride(null)}
              className="text-[11px] text-primary hover:underline cursor-pointer"
            >
              (redefinir auto)
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 bg-background/80 p-1 rounded-xl border border-border/60 self-start sm:self-auto shadow-xs">
          <button
            type="button"
            onClick={() => setViewModeOverride("compact")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              effectiveViewMode === "compact"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
            title="Exibir como lista compacta otimizada"
          >
            <List className="w-3.5 h-3.5" />
            Lista Compacta
          </button>
          <button
            type="button"
            onClick={() => setViewModeOverride("cards")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              effectiveViewMode === "cards"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
            title="Exibir como cards detalhados abertos"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Cards Detalhados
          </button>
        </div>
      </div>

      {/* Listagem de Pedidos */}
      {loading ? (
        <div className="flex justify-center py-16">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum pedido encontrado.</p>
        </div>
      ) : effectiveViewMode === "compact" ? (
        /* ── MODO 1: LISTA COMPACTA COM ACCORDION ── */
        <div className="space-y-2">
          {orders.map((order) => {
            const statusCfg = STATUS_CONFIG[order.status];
            const shortId = order.id.slice(-8).toUpperCase();
            const totalItems =
              order.items && order.items.length > 0
                ? order.items.reduce((s, i) => s + i.quantity, 0)
                : 1;

            const itemsSummary =
              order.items && order.items.length > 0
                ? order.items.map((i) => `${i.quantity}x ${i.title}`).join(", ")
                : order.product?.title || "Produto Pink Music";

            const isExpanded = expandedOrderIds.has(order.id);
            const isPickup = order.deliveryType === "pickup";

            return (
              <div
                key={order.id}
                className={`border rounded-xl bg-card overflow-hidden transition-all shadow-xs ${
                  isExpanded ? "border-primary/50 shadow-sm" : "border-border/70 hover:border-border"
                }`}
              >
                {/* Linha Compacta Principal */}
                <div
                  onClick={() => toggleExpandOrder(order.id)}
                  className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 sm:px-4 cursor-pointer hover:bg-muted/30 transition-colors"
                >
                  {/* Bloco 1: Status + ID + Data */}
                  <div className="flex items-center gap-2.5 min-w-[210px] shrink-0">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${statusCfg.color}`}
                    >
                      {statusCfg.icon}
                      {statusCfg.label}
                    </span>
                    <span className="font-mono text-xs font-bold text-foreground">
                      #{shortId}
                    </span>
                    <span className="text-[11px] text-muted-foreground hidden sm:inline">
                      · {formatDate(order.createdAt)}
                    </span>
                  </div>

                  {/* Bloco 2: Cliente + WhatsApp */}
                  <div className="flex items-center gap-2 min-w-[170px] text-xs">
                    <span className="font-semibold text-foreground truncate max-w-[140px]" title={order.customerName}>
                      {order.customerName}
                    </span>
                    {order.customerPhone && (
                      <a
                        href={`https://wa.me/55${order.customerPhone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[#25D366] hover:opacity-80 p-1 rounded hover:bg-[#25D366]/10 shrink-0"
                        title="Conversar no WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>

                  {/* Bloco 3: Resumo dos itens + Método de Entrega */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-1 min-w-[180px]">
                    <span className="truncate max-w-[240px]" title={itemsSummary}>
                      <strong className="text-foreground">{totalItems} {totalItems === 1 ? "item" : "itens"}:</strong> {itemsSummary}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-muted border border-border/50 shrink-0">
                      {isPickup ? (
                        <>
                          <Store className="w-3 h-3 text-primary" /> Balcão
                        </>
                      ) : (
                        <>
                          <Truck className="w-3 h-3 text-primary" /> Entrega
                        </>
                      )}
                    </span>
                  </div>

                  {/* Bloco 4: Valor Total + Ações Rápidas + Botão Expandir */}
                  <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-border/40">
                    <div className="font-display font-extrabold text-sm tabular text-foreground min-w-[90px] text-right">
                      {formatPrice(order.totalAmount)}
                      {order.discountAmount && order.discountAmount > 0 ? (
                        <span className="block text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                          PIX -{formatPrice(order.discountAmount)}
                        </span>
                      ) : null}
                    </div>

                    <div
                      className="flex items-center gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {renderOrderActions(order, true)}
                    </div>

                    <button
                      type="button"
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer shrink-0"
                      title={isExpanded ? "Recolher detalhes" : "Expandir detalhes"}
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-primary" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Bloco Expandido Inline (Accordion) */}
                {isExpanded && (
                  <div className="p-4 bg-muted/20 border-t border-border/60 text-xs space-y-4 animate-in fade-in-50 duration-200">
                    {/* Lista detalhada de itens */}
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                        <ShoppingCart className="w-3.5 h-3.5" />
                        Itens no pedido
                      </p>
                      <div className="rounded-lg border border-border/60 bg-card divide-y divide-border/40">
                        {order.items && order.items.length > 0 ? (
                          order.items.map((item) => (
                            <div key={item.id} className="flex items-center gap-3 p-2.5">
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
                                <p className="font-medium text-foreground line-clamp-1">{item.title}</p>
                                <span className="text-[11px] text-muted-foreground">
                                  Qtd: <strong className="text-foreground">{item.quantity}</strong> · {formatPrice(item.price)} un.
                                </span>
                              </div>
                              <span className="font-semibold text-foreground shrink-0">
                                {formatPrice(item.price * item.quantity)}
                              </span>
                            </div>
                          ))
                        ) : order.product ? (
                          <div className="flex items-center gap-3 p-2.5">
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
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-foreground line-clamp-1">{order.product.title}</p>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* Dados de entrega e endereço */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-border/40">
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {isPickup ? "Modalidade de Entrega" : "Endereço de Entrega"}
                        </p>
                        {isPickup ? (
                          <p className="text-foreground font-medium flex items-center gap-1.5">
                            <Store className="w-3.5 h-3.5 text-primary" />
                            Retirada na loja física Pink Music
                          </p>
                        ) : (
                          <p className="text-foreground font-medium flex items-start gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                            <span>{order.deliveryAddress || "Endereço não informado"}</span>
                          </p>
                        )}
                        {order.shippingCep && (
                          <p className="text-muted-foreground text-[11px]">CEP: {order.shippingCep}</p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Entrega / Motoboy
                        </p>
                        {order.uberCourierName ? (
                          <p className="text-foreground font-medium">
                            Entregador: <strong>{order.uberCourierName}</strong>
                            {order.uberCourierPhone && ` (${order.uberCourierPhone})`}
                          </p>
                        ) : (
                          <p className="text-muted-foreground">
                            {isPickup ? "Retirada pelo próprio cliente no balcão" : "Aguardando definição ou despacho"}
                          </p>
                        )}
                        {order.paidAt && (
                          <p className="text-muted-foreground text-[11px]">
                            Pago em: {formatDate(order.paidAt)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* ── MODO 2: CARDS DETALHADOS ABERTOS ── */
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
                              {order.needsReview && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 ml-1.5">
                                  ⚠️ Confirmar Bairro
                                </span>
                              )}
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
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">Total</span>
                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {formatPrice(order.totalAmount)}
                    </span>
                    {order.discountAmount && order.discountAmount > 0 ? (
                      <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.5 rounded">
                        Desconto PIX: -{formatPrice(order.discountAmount)}
                      </span>
                    ) : null}
                    {order.paidAt && (
                      <span className="text-[10px] text-muted-foreground hidden sm:inline">
                        · Pago {formatDate(order.paidAt)}
                      </span>
                    )}
                  </div>

                  {/* Ações */}
                  {renderOrderActions(order, false)}
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
                      Rua JJ Seabra, 31, Centro - Feira de Santana, BA
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

              {/* Dados do Entregador e da Corrida */}
              <div className="space-y-3 pt-2 border-t">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label htmlFor="courier-select" className="text-xs font-semibold flex items-center gap-1.5">
                      <Bike className="w-3.5 h-3.5 text-primary" />
                      Profissional (Motoboy)
                    </Label>
                    <Link
                      href="/dashboard/couriers"
                      target="_blank"
                      className="text-[11px] text-primary hover:underline"
                    >
                      + Gerenciar Motoboys
                    </Link>
                  </div>

                  {couriersList.length > 0 ? (
                    <select
                      id="courier-select"
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={selectedCourierId}
                      onChange={(e) => handleSelectCourierChange(e.target.value)}
                    >
                      <option value="">Entregador Avulso / Não cadastrado</option>
                      {couriersList.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.vehicle ? `• ${c.vehicle}` : ""} {c.plate ? `(${c.plate})` : ""}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-[11px] text-muted-foreground bg-muted/40 p-2 rounded">
                      Nenhum motoboy cadastrado ainda.{" "}
                      <Link href="/dashboard/couriers" target="_blank" className="text-primary underline">
                        Cadastre aqui
                      </Link>{" "}
                      para controlar o fechamento por período.
                    </p>
                  )}
                </div>

                {/* Se não for motoboy cadastrado, permite digitar nome e fone livremente */}
                {!selectedCourierId && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="courier-name" className="text-[11px] text-muted-foreground">
                        Nome do Entregador
                      </Label>
                      <Input
                        id="courier-name"
                        placeholder="Ex: Carlos (Entregador)"
                        value={dispatchCourierName}
                        onChange={(e) => setDispatchCourierName(e.target.value)}
                        className="h-8 text-xs mt-0.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="courier-phone" className="text-[11px] text-muted-foreground">
                        WhatsApp do Entregador
                      </Label>
                      <Input
                        id="courier-phone"
                        placeholder="Ex: (75) 98888-7777"
                        value={dispatchCourierPhone}
                        onChange={(e) => setDispatchCourierPhone(e.target.value)}
                        className="h-8 text-xs mt-0.5"
                      />
                    </div>
                  </div>
                )}

                {/* Valor da Corrida a Repassar ao Motoboy */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div>
                    <Label htmlFor="courier-fee" className="text-xs font-semibold flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                      Valor da Corrida (Repasse)
                    </Label>
                    <Input
                      id="courier-fee"
                      type="number"
                      step="0.50"
                      min="0"
                      placeholder="0,00"
                      value={dispatchCourierFee}
                      onChange={(e) => setDispatchCourierFee(parseFloat(e.target.value) || 0)}
                      className="h-8 text-xs mt-0.5 font-bold text-emerald-600 dark:text-emerald-400"
                    />
                    <span className="text-[10px] text-muted-foreground">
                      Valor que será contabilizado no fechamento do motoboy
                    </span>
                  </div>

                  <div>
                    <Label htmlFor="dispatch-notes" className="text-xs">
                      Observação da Corrida
                    </Label>
                    <Input
                      id="dispatch-notes"
                      placeholder="Ex: Cuidado, frágil / Chamar no portão"
                      value={dispatchNotes}
                      onChange={(e) => setDispatchNotes(e.target.value)}
                      className="h-8 text-xs mt-0.5"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
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
              variant="outline"
              className="border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40 gap-1.5"
              disabled={dispatching}
              onClick={() => handleConfirmDispatch(true)}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span>Despachar e Abrir WhatsApp</span>
            </Button>

            <Button
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white font-medium gap-1.5"
              disabled={dispatching}
              onClick={() => handleConfirmDispatch(false)}
            >
              {dispatching ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Despachando...
                </>
              ) : (
                <>
                  <Truck className="h-3.5 w-3.5" />
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
