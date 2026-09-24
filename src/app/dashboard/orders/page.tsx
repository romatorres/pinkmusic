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
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  deliveryType: string;
  deliveryAddress: string | null;
  totalAmount: number;
  status: OrderStatus;
  paidAt: string | null;
  uberDeliveryId: string | null;
  uberTrackingUrl: string | null;
  uberCourierName: string | null;
  uberCourierPhone: string | null;
  uberVehicleType: string | null;
  createdAt: string;
  product: {
    id: string;
    title: string;
    thumbnail: string;
    code?: string | null;
    packageSize?: "SMALL" | "MEDIUM" | "LARGE" | "XLARGE";
  };
}

interface OrdersMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface QuoteData {
  quoteId: string;
  fee: number; // em centavos
  currency: string;
  estimatedMinutes: number;
  expiresAt: string;
  packageSize?: string;
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

  // Estados do Modal de Cotação e Despacho Uber Direct
  const [quoteModalOrder, setQuoteModalOrder] = useState<Order | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null);
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

  const handleOpenQuoteModal = async (order: Order) => {
    setQuoteModalOrder(order);
    setQuoteLoading(true);
    setQuoteError(null);
    setQuoteData(null);

    try {
      const res = await fetch(`/api/orders/${order.id}/dispatch`);
      const result = await res.json();
      if (result.success && result.data) {
        setQuoteData(result.data);
      } else {
        setQuoteError(
          result.error || "Não foi possível calcular o frete com o Uber Direct."
        );
      }
    } catch {
      setQuoteError("Erro de conexão ao buscar cotação da Uber.");
    } finally {
      setQuoteLoading(false);
    }
  };

  const handleConfirmDispatch = async () => {
    if (!quoteModalOrder) return;
    setDispatching(true);
    try {
      const res = await fetch(`/api/orders/${quoteModalOrder.id}/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId: quoteData?.quoteId }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success(
          "Entrega Uber Direct solicitada com sucesso! O motoboy está a caminho."
        );
        setQuoteModalOrder(null);
        fetchOrders();
      } else {
        toast.error(result.error || "Erro ao acionar entregador Uber Direct.");
      }
    } catch {
      toast.error("Erro de conexão ao despachar com a Uber.");
    } finally {
      setDispatching(false);
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
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-semibold text-sm line-clamp-1">{order.product.title}</p>
                      {order.product.code && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          Cód: {order.product.code}
                        </span>
                      )}
                      {order.product.packageSize && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-1"
                          title="Porte de transporte no Uber Direct"
                        >
                          {order.product.packageSize === "SMALL"
                            ? "🛵 Moto"
                            : order.product.packageSize === "LARGE" || order.product.packageSize === "XLARGE"
                            ? "🚗 Carro"
                            : "📦 Médio"}
                        </span>
                      )}
                    </div>
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

                    {/* Dados do Entregador Uber Direct (quando despachado) */}
                    {order.uberDeliveryId && (
                      <div className="mt-2 p-2 rounded-lg bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/80 text-xs space-y-1">
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <span className="font-semibold text-purple-800 dark:text-purple-200 flex items-center gap-1">
                            {order.uberVehicleType === "motorcycle" || order.uberVehicleType === "scooter" || order.uberVehicleType === "bicycle" ? (
                              <>
                                <span>🛵</span>
                                <span>Motoboy Alocado:</span>
                              </>
                            ) : order.uberVehicleType === "car" || order.uberVehicleType === "van" ? (
                              <>
                                <span>🚗</span>
                                <span>Motorista Alocado:</span>
                              </>
                            ) : (
                              <>
                                <Truck className="h-3.5 w-3.5 text-purple-600" />
                                <span>Uber Direct:</span>
                              </>
                            )}
                            <span className="font-normal text-foreground">
                              {order.uberCourierName || "Aguardando confirmação do motorista"}
                            </span>
                          </span>
                          {order.uberVehicleType && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300 font-medium">
                              {order.uberVehicleType === "motorcycle"
                                ? "Moto"
                                : order.uberVehicleType === "car"
                                ? "Carro"
                                : order.uberVehicleType}
                            </span>
                          )}
                        </div>
                        {order.uberCourierPhone && (
                          <p className="text-[11px] text-muted-foreground">
                            Contato do entregador: <span className="font-medium text-foreground">{order.uberCourierPhone}</span>
                          </p>
                        )}
                      </div>
                    )}
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
                  {/* Botão de cotação e despacho Uber Direct */}
                  {(order.status === "PAID" || order.status === "PREPARING") &&
                    order.deliveryType === "delivery" && (
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white font-medium"
                        disabled={updatingId === order.id || dispatching}
                        onClick={() => handleOpenQuoteModal(order)}
                      >
                        <Truck className="h-3.5 w-3.5 mr-1" />
                        Cotar Uber Direct
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

      {/* Modal de Cotação e Despacho Uber Direct */}
      <Dialog
        open={!!quoteModalOrder}
        onOpenChange={(open) => !open && !dispatching && setQuoteModalOrder(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <Truck className="h-5 w-5 text-purple-600" />
              Cotação Uber Direct
            </DialogTitle>
            <DialogDescription className="text-xs">
              {quoteModalOrder &&
                `Pedido #${quoteModalOrder.id.slice(-6)} · ${quoteModalOrder.product.title}`}
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
                      Rua JJ Seabra, 31 - Centro, Feira de Santana, BA
                    </p>
                  </div>
                </div>
                <div className="border-t border-border/60 pt-2 flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-foreground">
                      Entrega para {quoteModalOrder.customerName}
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

              {/* Loading */}
              {quoteLoading && (
                <div className="flex flex-col items-center justify-center py-6 gap-2 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                  <p className="text-xs">Calculando melhor rota e valor com a Uber...</p>
                </div>
              )}

              {/* Erro */}
              {quoteError && !quoteLoading && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 flex items-start gap-2 text-xs text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium">Falha na cotação</p>
                    <p className="mt-0.5 text-muted-foreground">{quoteError}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 h-6 text-xs"
                      onClick={() => handleOpenQuoteModal(quoteModalOrder)}
                    >
                      Tentar Novamente
                    </Button>
                  </div>
                </div>
              )}

              {/* Resultado da Cotação */}
              {quoteData && !quoteLoading && (
                <div className="rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 p-4 space-y-3">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-xs text-muted-foreground font-medium">
                        Preço da Corrida Uber
                      </span>
                      <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                        {formatPrice(quoteData.fee / 100)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground font-medium">
                        Previsão
                      </span>
                      <p className="text-base font-semibold text-foreground flex items-center gap-1 justify-end">
                        <Clock className="h-4 w-4 text-purple-600" />
                        ~{quoteData.estimatedMinutes} min
                      </p>
                    </div>
                  </div>

                  {/* Informação do Porte e Transporte */}
                  <div className="border-t border-purple-200/60 dark:border-purple-800/60 pt-2.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                        {(quoteData.packageSize || quoteModalOrder.product.packageSize) === "SMALL" ? (
                          <>
                            <span>🛵</span>
                            <span>Transporte Previsto: Moto</span>
                          </>
                        ) : (quoteData.packageSize || quoteModalOrder.product.packageSize) === "LARGE" || (quoteData.packageSize || quoteModalOrder.product.packageSize) === "XLARGE" ? (
                          <>
                            <span>🚗</span>
                            <span>Transporte Previsto: Carro</span>
                          </>
                        ) : (
                          <>
                            <span>📦</span>
                            <span>Transporte: Moto ou Carro</span>
                          </>
                        )}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-200/70 dark:bg-purple-900 text-purple-900 dark:text-purple-200 font-medium">
                        {(quoteData.packageSize || quoteModalOrder.product.packageSize) === "SMALL"
                          ? "Porte Pequeno"
                          : (quoteData.packageSize || quoteModalOrder.product.packageSize) === "LARGE" || (quoteData.packageSize || quoteModalOrder.product.packageSize) === "XLARGE"
                          ? "Porte Grande"
                          : "Porte Médio"}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {(quoteData.packageSize || quoteModalOrder.product.packageSize) === "SMALL"
                        ? "Produto cabe na bag/mochila. A Uber prioriza motoboys para retirada rápida."
                        : (quoteData.packageSize || quoteModalOrder.product.packageSize) === "LARGE" || (quoteData.packageSize || quoteModalOrder.product.packageSize) === "XLARGE"
                        ? "Instrumento volumoso. A Uber direcionará motorista com porta-malas para proteger o instrumento."
                        : "A Uber alocará o entregador parceiro mais próximo disponível."}
                    </p>
                  </div>
                </div>
              )}
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
              disabled={!quoteData || quoteLoading || dispatching}
              onClick={handleConfirmDispatch}
            >
              {dispatching ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Acionando Entregador...
                </>
              ) : (
                <>
                  {(quoteData?.packageSize || quoteModalOrder?.product.packageSize) === "SMALL" ? (
                    <>
                      <span className="mr-1.5">🛵</span>
                      Confirmar e Chamar Motoboy
                    </>
                  ) : (quoteData?.packageSize || quoteModalOrder?.product.packageSize) === "LARGE" || (quoteData?.packageSize || quoteModalOrder?.product.packageSize) === "XLARGE" ? (
                    <>
                      <span className="mr-1.5">🚗</span>
                      Confirmar e Chamar Carro
                    </>
                  ) : (
                    <>
                      <Truck className="h-3.5 w-3.5 mr-1.5" />
                      Confirmar e Chamar Entregador
                    </>
                  )}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
