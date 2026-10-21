"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Printer,
  MessageCircle,
  Copy,
  RefreshCw,
  Filter,
  Search,
  DollarSign,
  ShoppingCart,
  Truck,
  CheckCircle2,
  Store,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  thumbnail?: string | null;
  productCode?: string | null;
}

interface OrderReportItem {
  id: string;
  customerName: string;
  customerPhone: string;
  deliveryType: string;
  deliveryAddress: string | null;
  deliveryFee?: number;
  totalAmount: number;
  status: OrderStatus;
  paidAt: string | null;
  shippingZone?: string | null;
  shippingDistance?: number | null;
  createdAt: string;
  product?: {
    id: string;
    title: string;
    thumbnail: string;
    code?: string | null;
  } | null;
  items?: OrderItem[];
  user?: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
  } | null;
  deliveryRide?: {
    id: string;
    courierFee: number;
    clientFee: number;
    paymentStatus: string;
    status: string;
    courier?: {
      id: string;
      name: string;
      phone: string;
    };
  } | null;
}

interface ReportSummary {
  totalOrders: number;
  totalSales: number;
  totalDeliveryFees: number;
  totalProductsValue: number;
  paidOrdersCount: number;
  paidSales: number;
  averageTicket: number;
  byDeliveryType: {
    delivery: { count: number; total: number; fees: number };
    pickup: { count: number; total: number };
  };
  byStatus: Record<string, { count: number; total: number }>;
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; badgeClass: string }> = {
  PENDING_PAYMENT: {
    label: "Aguardando PIX",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300",
  },
  PAID: {
    label: "Pago",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  PREPARING: {
    label: "Em Preparação",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300",
  },
  DISPATCHED: {
    label: "Despachado",
    badgeClass: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300",
  },
  DELIVERED: {
    label: "Entregue",
    badgeClass: "bg-green-100 text-green-800 border-green-200 dark:bg-green-950/40 dark:text-green-300",
  },
  CANCELLED: {
    label: "Cancelado",
    badgeClass: "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300",
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

function formatCurrency(val: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(val);
}

export default function OrderSalesReportPage() {
  const [orders, setOrders] = useState<OrderReportItem[]>([]);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [deliveryTypeFilter, setDeliveryTypeFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Atalhos de datas
  const setDatePreset = (preset: "today" | "yesterday" | "thisWeek" | "thisMonth" | "clear") => {
    const now = new Date();
    const fmt = (d: Date) => d.toISOString().split("T")[0];

    if (preset === "clear") {
      setStartDate("");
      setEndDate("");
      return;
    }

    if (preset === "today") {
      const s = fmt(now);
      setStartDate(s);
      setEndDate(s);
      return;
    }

    if (preset === "yesterday") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const s = fmt(y);
      setStartDate(s);
      setEndDate(s);
      return;
    }

    if (preset === "thisWeek") {
      const first = new Date(now);
      const day = first.getDay();
      const diff = first.getDate() - day + (day === 0 ? -6 : 1);
      first.setDate(diff);
      setStartDate(fmt(first));
      setEndDate(fmt(now));
      return;
    }

    if (preset === "thisMonth") {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(fmt(first));
      setEndDate(fmt(now));
      return;
    }
  };

  const loadReport = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (deliveryTypeFilter && deliveryTypeFilter !== "ALL") {
        params.set("deliveryType", deliveryTypeFilter);
      }
      if (statusFilter && statusFilter !== "ALL") {
        params.set("status", statusFilter);
      }
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/orders/report?${params.toString()}`);
      const json = await res.json();

      if (res.ok && json.success) {
        setOrders(json.data.orders);
        setSummary(json.data.summary);
      } else {
        toast.error(json.error || "Erro ao carregar relatório de vendas");
      }
    } catch {
      toast.error("Erro de conexão ao carregar relatório.");
    } finally {
      setLoading(false);
    }
  }, [deliveryTypeFilter, statusFilter, startDate, endDate, searchQuery]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  // Mensagem consolidada para compartilhar no WhatsApp
  const handleShareWhatsApp = () => {
    if (!summary || orders.length === 0) {
      toast.error("Nenhum dado encontrado para gerar resumo.");
      return;
    }

    const periodStr =
      startDate && endDate
        ? `Período: ${new Date(startDate + "T12:00:00").toLocaleDateString("pt-BR")} até ${new Date(
            endDate + "T12:00:00"
          ).toLocaleDateString("pt-BR")}`
        : "Período: Todo o histórico recente";

    const lines = [
      `📊 *RELATÓRIO DE VENDAS — PINK MUSIC*`,
      `📅 *${periodStr}*`,
      ``,
      `💰 *Faturamento Total:* ${formatCurrency(summary.totalSales)}`,
      `🎸 *Vendas em Produtos:* ${formatCurrency(summary.totalProductsValue)}`,
      `🛵 *Total em Fretes:* ${formatCurrency(summary.totalDeliveryFees)}`,
      `📦 *Total de Pedidos:* ${summary.totalOrders}`,
      `🏷️ *Ticket Médio:* ${formatCurrency(summary.averageTicket)}`,
      `✅ *Vendas Confirmadas (Pagas):* ${summary.paidOrdersCount} pedidos (${formatCurrency(
        summary.paidSales
      )})`,
      ``,
      `📍 *Por Modalidade:*`,
      `• Delivery Local: ${summary.byDeliveryType.delivery.count} pedidos (${formatCurrency(
        summary.byDeliveryType.delivery.total
      )})`,
      `• Retirada no Balcão: ${summary.byDeliveryType.pickup.count} pedidos (${formatCurrency(
        summary.byDeliveryType.pickup.total
      )})`,
      ``,
      `*Últimos pedidos filtrados:*`,
    ];

    orders.slice(0, 15).forEach((order, idx) => {
      const dateStr = new Date(order.createdAt).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      });
      const shortId = order.id.slice(-6).toUpperCase();
      const statusLabel = STATUS_CONFIG[order.status]?.label || order.status;
      lines.push(
        `${idx + 1}. [${dateStr}] #${shortId} - ${order.customerName.split(" ")[0]} (${formatCurrency(
          order.totalAmount
        )}) [${statusLabel}]`
      );
    });

    if (orders.length > 15) {
      lines.push(`... e mais ${orders.length - 15} pedido(s).`);
    }

    lines.push(``);
    lines.push(`Relatório gerado automaticamente via Pink Music Sistema de Gestão.`);

    const msg = encodeURIComponent(lines.join("\n"));
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  const copySummaryToClipboard = () => {
    if (!summary || orders.length === 0) {
      toast.error("Nenhum dado para copiar.");
      return;
    }

    const periodStr =
      startDate && endDate
        ? `${new Date(startDate + "T12:00:00").toLocaleDateString("pt-BR")} até ${new Date(
            endDate + "T12:00:00"
          ).toLocaleDateString("pt-BR")}`
        : "Todo o histórico recente";

    const text = [
      `RELATÓRIO DE VENDAS - PINK MUSIC`,
      `Período: ${periodStr}`,
      `Total de Pedidos: ${summary.totalOrders}`,
      `Faturamento Total: ${formatCurrency(summary.totalSales)}`,
      `Vendas em Produtos: ${formatCurrency(summary.totalProductsValue)}`,
      `Total em Fretes: ${formatCurrency(summary.totalDeliveryFees)}`,
      `Ticket Médio: ${formatCurrency(summary.averageTicket)}`,
      `Vendas Confirmadas/Pagas: ${summary.paidOrdersCount} (${formatCurrency(summary.paidSales)})`,
    ].join("\n");

    navigator.clipboard.writeText(text);
    toast.success("Resumo copiado para a área de transferência!");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ── Topo & Cabeçalho da Página (Visível em Tela) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5 print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/orders"
            className="p-2 rounded-xl border hover:bg-muted text-muted-foreground transition-colors"
            title="Voltar para Pedidos & Vendas"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Relatório de Vendas</h1>
              <span className="bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs px-2.5 py-0.5 rounded-full font-bold">
                Faturamento da Loja
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Acompanhe quanto a loja vendeu por período, filtre por modalidade e exporte para PDF em folha A4
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="gap-2 border-purple-500/30 text-purple-600 hover:bg-purple-50 hover:text-purple-700 dark:hover:bg-purple-950/40"
            onClick={() => window.print()}
            disabled={orders.length === 0}
            title="Gera o relatório formatado para salvar em PDF ou imprimir em folha A4"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir / PDF</span>
          </Button>

          <Button
            variant="outline"
            className="gap-2 border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40"
            onClick={handleShareWhatsApp}
            disabled={orders.length === 0}
            title="Compartilhar resumo das vendas no WhatsApp"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Enviar no WhatsApp</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
            onClick={copySummaryToClipboard}
            title="Copiar resumo textual"
          >
            <Copy className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={loadReport}
            disabled={loading}
            title="Atualizar dados"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* ── Painel de Filtros (print:hidden) ── */}
      <div className="border rounded-2xl bg-card p-5 space-y-4 shadow-xs print:hidden">
        <div className="flex items-center gap-2 pb-2 border-b border-border/40 text-sm font-semibold text-purple-700 dark:text-purple-400">
          <Filter className="w-4 h-4" />
          <span>Filtros do Período de Vendas</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Tipo de Entrega */}
          <div>
            <Label htmlFor="deliveryTypeSelect" className="text-xs">
              Modalidade de Entrega
            </Label>
            <select
              id="deliveryTypeSelect"
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={deliveryTypeFilter}
              onChange={(e) => setDeliveryTypeFilter(e.target.value)}
            >
              <option value="ALL">Todas as Modalidades (Delivery + Balcão)</option>
              <option value="delivery">Apenas Entrega Local (Delivery)</option>
              <option value="pickup">Apenas Retirada no Balcão (Pickup)</option>
            </select>
          </div>

          {/* Status do Pedido */}
          <div>
            <Label htmlFor="statusSelect" className="text-xs">
              Status do Pedido
            </Label>
            <select
              id="statusSelect"
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">Todos os Status</option>
              {ALL_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {STATUS_CONFIG[st].label}
                </option>
              ))}
            </select>
          </div>

          {/* Data Inicial */}
          <div>
            <Label htmlFor="startDate" className="text-xs">
              Data Inicial
            </Label>
            <Input
              id="startDate"
              type="date"
              className="mt-1"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          {/* Data Final */}
          <div>
            <Label htmlFor="endDate" className="text-xs">
              Data Final
            </Label>
            <Input
              id="endDate"
              type="date"
              className="mt-1"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        {/* Atalhos de Datas e Busca Rápida */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-border/40">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground font-medium">Atalhos rápidos:</span>
            {(["today", "yesterday", "thisWeek", "thisMonth"] as const).map((p) => (
              <Button
                key={p}
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => setDatePreset(p)}
              >
                {p === "today"
                  ? "Hoje"
                  : p === "yesterday"
                  ? "Ontem"
                  : p === "thisWeek"
                  ? "Esta Semana"
                  : "Este Mês"}
              </Button>
            ))}
            {(startDate || endDate) && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-muted-foreground"
                onClick={() => setDatePreset("clear")}
              >
                Limpar Período
              </Button>
            )}
          </div>

          {/* Busca por cliente ou pedido */}
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente, tel ou ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") loadReport();
                }}
                className="h-8 pl-8 text-xs"
              />
            </div>
            {searchQuery && (
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={loadReport}>
                Filtrar
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Cards de Indicadores / KPIs (print:hidden) ── */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
          {/* Faturamento Total */}
          <div className="border rounded-2xl bg-card p-4 space-y-1 shadow-xs border-purple-500/20">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Faturamento Total</span>
              <DollarSign className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {formatCurrency(summary.totalSales)}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {summary.totalOrders} pedido(s) no filtro selecionado
            </p>
          </div>

          {/* Vendas de Produtos */}
          <div className="border rounded-2xl bg-card p-4 space-y-1 shadow-xs border-emerald-500/20">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Vendas em Produtos</span>
              <ShoppingCart className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {formatCurrency(summary.totalProductsValue)}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Exclui taxas de entrega
            </p>
          </div>

          {/* Total em Fretes */}
          <div className="border rounded-2xl bg-card p-4 space-y-1 shadow-xs border-blue-500/20">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Total em Fretes</span>
              <Truck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {formatCurrency(summary.totalDeliveryFees)}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {summary.byDeliveryType.delivery.count} entrega(s) local realizada(s)
            </p>
          </div>

          {/* Vendas Pagas / Confirmadas */}
          <div className="border rounded-2xl bg-card p-4 space-y-1 shadow-xs border-amber-500/20">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Ticket Médio</span>
              <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {formatCurrency(summary.averageTicket)}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Confirmadas: {summary.paidOrdersCount} pedidos ({formatCurrency(summary.paidSales)})
            </p>
          </div>
        </div>
      )}

      {/* ── Tabela Interativa na Tela (print:hidden) ── */}
      <div className="border rounded-2xl bg-card shadow-xs overflow-hidden print:hidden">
        <div className="p-4 border-b border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-purple-600" />
            <h2 className="text-sm font-semibold">Detalhamento dos Pedidos</h2>
            <span className="text-xs text-muted-foreground">({orders.length} itens)</span>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
            Carregando relatório consolidado...
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            Nenhum pedido encontrado para os filtros selecionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border/60 text-muted-foreground font-semibold uppercase text-[11px]">
                <tr>
                  <th className="p-3 text-center w-10">#</th>
                  <th className="p-3 w-32">Data / Hora</th>
                  <th className="p-3 w-28">Pedido</th>
                  <th className="p-3">Cliente</th>
                  <th className="p-3">Modalidade / Destino</th>
                  <th className="p-3">Itens Comprados</th>
                  <th className="p-3 text-right w-24">Frete</th>
                  <th className="p-3 text-right w-28">Valor Total</th>
                  <th className="p-3 text-center w-28">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {orders.map((order, idx) => {
                  const shortId = order.id.slice(-8).toUpperCase();
                  const itemsSummary =
                    order.items && order.items.length > 0
                      ? order.items
                          .map(
                            (i) =>
                              `${i.quantity}x ${i.title}${
                                i.productCode ? ` [${i.productCode}]` : ""
                              }`
                          )
                          .join(", ")
                      : order.product?.title || "—";

                  const cfg = STATUS_CONFIG[order.status] || {
                    label: order.status,
                    badgeClass: "bg-muted text-foreground border-border",
                  };

                  return (
                    <tr
                      key={order.id}
                      className={idx % 2 === 0 ? "bg-card" : "bg-muted/20 hover:bg-muted/40"}
                    >
                      <td className="p-3 text-center font-mono text-muted-foreground">
                        {idx + 1}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {new Date(order.createdAt).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="p-3 font-mono font-bold">
                        <Link
                          href={`/dashboard/orders`}
                          className="text-purple-600 hover:underline"
                        >
                          #{shortId}
                        </Link>
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-foreground">
                          {order.customerName}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {order.customerPhone}
                        </div>
                      </td>
                      <td className="p-3">
                        {order.deliveryType === "pickup" ? (
                          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                            <Store className="w-3.5 h-3.5" />
                            <span>Retirada no Balcão</span>
                          </div>
                        ) : (
                          <div>
                            <div className="font-medium text-foreground line-clamp-2">
                              {order.deliveryAddress || "Endereço não informado"}
                            </div>
                            {order.shippingZone && (
                              <div className="text-[11px] text-muted-foreground">
                                [{order.shippingZone}]
                                {order.shippingDistance
                                  ? ` · ~${order.shippingDistance.toFixed(1)} km`
                                  : ""}
                              </div>
                            )}
                            {order.deliveryRide?.courier && (
                              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                                🛵 {order.deliveryRide.courier.name}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-3 max-w-xs">
                        <div className="text-muted-foreground line-clamp-2" title={itemsSummary}>
                          {itemsSummary}
                        </div>
                      </td>
                      <td className="p-3 text-right font-medium whitespace-nowrap">
                        {order.deliveryType === "delivery"
                          ? formatCurrency(order.deliveryFee || 0)
                          : "—"}
                      </td>
                      <td className="p-3 text-right font-bold whitespace-nowrap text-sm text-foreground">
                        {formatCurrency(order.totalAmount)}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.badgeClass}`}
                        >
                          {cfg.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {summary && (
                <tfoot className="bg-muted/70 font-bold border-t-2 border-border/80">
                  <tr>
                    <td colSpan={6} className="p-3 text-right uppercase text-xs">
                      Total Geral do Período ({summary.totalOrders} pedidos)
                    </td>
                    <td className="p-3 text-right font-bold text-sm text-blue-600 dark:text-blue-400">
                      {formatCurrency(summary.totalDeliveryFees)}
                    </td>
                    <td className="p-3 text-right font-black text-sm text-purple-600 dark:text-purple-400">
                      {formatCurrency(summary.totalSales)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════
          LAYOUT EXCLUSIVO PARA IMPRESSÃO / SALVAR EM PDF (FOLHA A4)
          ══════════════════════════════════════════════════════════ */}
      <div className="hidden print:block p-2 text-black bg-white space-y-4 font-sans">
        {/* Cabeçalho Institucional */}
        <div className="flex items-start justify-between border-b-2 border-black pb-3">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight">Pink Music</h1>
            <p className="text-xs text-gray-700 font-medium">
              Comércio de Instrumentos Musicais &amp; Acessórios
            </p>
            <p className="text-[10px] text-gray-500">
              Feira de Santana - BA · Sistema de Controle de Vendas
            </p>
          </div>
          <div className="text-right">
            <h2 className="text-sm font-bold uppercase tracking-wider">
              Relatório Geral de Vendas
            </h2>
            <p className="text-[11px] text-gray-600">
              Emitido em: {new Date().toLocaleString("pt-BR")}
            </p>
          </div>
        </div>

        {/* Ficha de Filtros Aplicados */}
        <div className="grid grid-cols-2 gap-4 border border-gray-400 rounded p-3 text-xs bg-gray-50/60">
          <div className="space-y-1">
            <p>
              <strong className="text-gray-900">Modalidade:</strong>{" "}
              {deliveryTypeFilter === "delivery"
                ? "Apenas Entrega Local (Delivery)"
                : deliveryTypeFilter === "pickup"
                ? "Apenas Retirada no Balcão (Pickup)"
                : "Todas as Modalidades (Delivery + Balcão)"}
            </p>
            <p>
              <strong className="text-gray-900">Filtro de Status:</strong>{" "}
              {statusFilter !== "ALL"
                ? STATUS_CONFIG[statusFilter as OrderStatus]?.label || statusFilter
                : "Todos os Status"}
            </p>
          </div>
          <div className="space-y-1">
            <p>
              <strong className="text-gray-900">Período de Vendas:</strong>{" "}
              {startDate && endDate
                ? `${new Date(startDate + "T12:00:00").toLocaleDateString(
                    "pt-BR"
                  )} até ${new Date(endDate + "T12:00:00").toLocaleDateString("pt-BR")}`
                : "Todo o histórico recente filtrado"}
            </p>
            <p>
              <strong className="text-gray-900">Total de Pedidos:</strong>{" "}
              {orders.length} pedido(s)
            </p>
          </div>
        </div>

        {/* Tabela Formatada para Folha A4 */}
        <table className="w-full text-left text-xs border border-gray-400 mt-2">
          <thead className="bg-gray-100 border-b border-gray-400 font-bold uppercase text-[10px]">
            <tr>
              <th className="p-2 border-r border-gray-300 text-center w-8">#</th>
              <th className="p-2 border-r border-gray-300 w-28">Data / Hora</th>
              <th className="p-2 border-r border-gray-300 w-24">Pedido</th>
              <th className="p-2 border-r border-gray-300">Cliente</th>
              <th className="p-2 border-r border-gray-300">Modalidade / Endereço</th>
              <th className="p-2 border-r border-gray-300">Itens Comprados</th>
              <th className="p-2 border-r border-gray-300 text-right w-20">Frete</th>
              <th className="p-2 border-r border-gray-300 text-right w-24">Total</th>
              <th className="p-2 text-center w-20">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {orders.map((order, idx) => {
              const shortId = order.id.slice(-8).toUpperCase();
              const itemsSummary =
                order.items && order.items.length > 0
                  ? order.items
                      .map(
                        (i) =>
                          `${i.quantity}x ${i.title}${
                            i.productCode ? ` [${i.productCode}]` : ""
                          }`
                      )
                      .join(", ")
                  : order.product?.title || "—";
              const statusLabel =
                STATUS_CONFIG[order.status]?.label || order.status;

              return (
                <tr
                  key={order.id}
                  className={idx % 2 === 0 ? "bg-white" : "bg-gray-50/80"}
                >
                  <td className="p-2 border-r border-gray-300 text-center font-mono">
                    {idx + 1}
                  </td>
                  <td className="p-2 border-r border-gray-300 whitespace-nowrap">
                    {new Date(order.createdAt).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="p-2 border-r border-gray-300 font-mono font-bold">
                    #{shortId}
                  </td>
                  <td className="p-2 border-r border-gray-300">
                    <div className="font-semibold text-gray-900">
                      {order.customerName}
                    </div>
                    <div className="text-[10px] text-gray-600">
                      {order.customerPhone}
                    </div>
                  </td>
                  <td className="p-2 border-r border-gray-300">
                    {order.deliveryType === "pickup" ? (
                      <span className="font-medium text-gray-700">
                        🏪 Retirada no balcão
                      </span>
                    ) : (
                      <div>
                        <div className="font-medium text-gray-900 text-[11px] line-clamp-2">
                          {order.deliveryAddress || "Endereço não informado"}
                        </div>
                        {order.shippingZone && (
                          <div className="text-[10px] text-gray-600">
                            [{order.shippingZone}]
                            {order.shippingDistance
                              ? ` · ~${order.shippingDistance.toFixed(1)} km`
                              : ""}
                          </div>
                        )}
                        {order.deliveryRide?.courier && (
                          <div className="text-[10px] text-gray-600">
                            🛵 {order.deliveryRide.courier.name}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="p-2 border-r border-gray-300">
                    <div className="text-[10px] text-gray-700 line-clamp-3">
                      {itemsSummary}
                    </div>
                  </td>
                  <td className="p-2 border-r border-gray-300 text-right font-semibold whitespace-nowrap">
                    {order.deliveryType === "delivery"
                      ? formatCurrency(order.deliveryFee || 0)
                      : "—"}
                  </td>
                  <td className="p-2 border-r border-gray-300 text-right font-bold whitespace-nowrap text-sm">
                    {formatCurrency(order.totalAmount)}
                  </td>
                  <td className="p-2 text-center font-bold text-[10px] whitespace-nowrap">
                    {statusLabel}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {summary && (
            <tfoot className="bg-gray-100 font-bold border-t-2 border-gray-400">
              <tr>
                <td colSpan={6} className="p-2 text-right uppercase text-[11px]">
                  Total Geral ({orders.length} pedidos)
                </td>
                <td className="p-2 text-right font-black text-sm border-r border-gray-300">
                  {formatCurrency(summary.totalDeliveryFees)}
                </td>
                <td className="p-2 text-right font-black text-sm border-r border-gray-300">
                  {formatCurrency(summary.totalSales)}
                </td>
                <td className="p-2"></td>
              </tr>
            </tfoot>
          )}
        </table>

        {/* Resumo Financeiro em Caixa */}
        {summary && (
          <div className="flex justify-end pt-2">
            <div className="w-80 border-2 border-gray-400 p-3 rounded bg-gray-50 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span>Total de Pedidos Listados:</span>
                <strong>{summary.totalOrders}</strong>
              </div>
              <div className="flex justify-between">
                <span>Vendas em Produtos:</span>
                <span className="font-semibold">
                  {formatCurrency(summary.totalProductsValue)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Total de Fretes (Delivery):</span>
                <span className="font-semibold">
                  {formatCurrency(summary.totalDeliveryFees)}
                </span>
              </div>
              <div className="flex justify-between border-t border-gray-300 pt-1 text-sm font-black">
                <span>Faturamento Geral da Loja:</span>
                <span className="text-black">{formatCurrency(summary.totalSales)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Campo de Assinaturas */}
        <div className="pt-12 grid grid-cols-2 gap-16 text-center text-xs">
          <div>
            <div className="border-t border-black pt-1 font-bold">
              Responsável Operacional / Vendas
            </div>
            <span className="text-[10px] text-gray-600">Conferência e Fechamento</span>
          </div>
          <div>
            <div className="border-t border-black pt-1 font-bold">
              Pink Music — Gestão Financeira
            </div>
            <span className="text-[10px] text-gray-600">Visto da Gerência</span>
          </div>
        </div>
      </div>
    </div>
  );
}
