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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type OrderStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "PREPARING"
  | "DISPATCHED"
  | "DELIVERED"
  | "CANCELLED";

interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  deliveryType: string;
  deliveryAddress: string | null;
  totalAmount: number;
  status: OrderStatus;
  paidAt: string | null;
  uberTrackingUrl: string | null;
  createdAt: string;
  product: {
    id: string;
    title: string;
    thumbnail: string;
  };
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => { setFilterStatus(""); setPage(1); }}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
            filterStatus === ""
              ? "bg-primary text-white border-primary"
              : "border-border hover:bg-muted"
          }`}
        >
          Todos
        </button>
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => { setFilterStatus(s); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              filterStatus === s
                ? "bg-primary text-white border-primary"
                : "border-border hover:bg-muted"
            }`}
          >
            {STATUS_CONFIG[s].label}
          </button>
        ))}
      </div>

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
                  <span className="text-xs text-muted-foreground">
                    {formatDate(order.createdAt)}
                  </span>
                </div>

                {/* Linha 2: produto + valor */}
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm line-clamp-1">{order.product.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Cliente: <span className="font-medium">{order.customerName}</span> · {order.customerPhone}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                      {order.deliveryType === "pickup" ? (
                        <>
                          <Store className="h-3.5 w-3.5" />
                          Retirada na loja
                        </>
                      ) : (
                        <>
                          <Truck className="h-3.5 w-3.5" />
                          Entrega: {order.deliveryAddress || "Não informado"}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-emerald-600 dark:text-emerald-400">
                      {formatPrice(order.totalAmount)}
                    </p>
                    {order.paidAt && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Pago {formatDate(order.paidAt)}
                      </p>
                    )}
                  </div>
                </div>

                {/* ID do pedido */}
                <p className="text-[10px] text-muted-foreground font-mono">
                  Pedido: {order.id}
                </p>

                {/* Ações */}
                <div className="flex flex-wrap gap-2 pt-1 border-t border-border">
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
                  {order.status === "PREPARING" && order.deliveryType === "delivery" && (
                    <Button
                      size="sm"
                      className="h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white"
                      disabled={updatingId === order.id}
                      onClick={() => handleStatusChange(order.id, "DISPATCHED")}
                    >
                      <Truck className="h-3.5 w-3.5 mr-1" />
                      Despachar (Uber Direct)
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
                      className="inline-flex items-center gap-1 h-7 px-2.5 text-xs rounded border border-border hover:bg-muted transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Rastrear Uber
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
    </div>
  );
}
