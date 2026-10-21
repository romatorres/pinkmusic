"use client";

import { useEffect, useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Bike,
  Receipt,
  Calendar,
  Filter,
  CheckCircle2,
  Clock,
  ArrowLeft,
  DollarSign,
  Copy,
  MessageCircle,
  CreditCard,
  RefreshCw,
  ExternalLink,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CourierBasic {
  id: string;
  name: string;
  phone: string;
  pixKey: string | null;
  pixKeyType: string | null;
  vehicle: string | null;
  plate: string | null;
}

interface DeliveryRide {
  id: string;
  orderId: string;
  courierId: string;
  clientFee: number;
  courierFee: number;
  distanceKm: number | null;
  status: "ASSIGNED" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED";
  paymentStatus: "PENDING" | "PAID";
  paidAt: string | null;
  assignedAt: string;
  notes: string | null;
  courier: CourierBasic;
  order: {
    id: string;
    customerName: string;
    customerPhone: string;
    deliveryAddress: string | null;
    shippingDistance: number | null;
    shippingZone: string | null;
    totalAmount: number;
    status: string;
    createdAt: string;
  };
}

export default function CourierSettlementPage() {
  const searchParams = useSearchParams();
  const initialCourierId = searchParams.get("courierId") || "ALL";

  const [couriers, setCouriers] = useState<CourierBasic[]>([]);
  const [selectedCourierId, setSelectedCourierId] = useState<string>(initialCourierId);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<"ALL" | "PENDING" | "PAID">("ALL");

  // Datas
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [rides, setRides] = useState<DeliveryRide[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRideIds, setSelectedRideIds] = useState<string[]>([]);

  const [isPending, startTransition] = useTransition();

  // Carregar lista de motoboys
  useEffect(() => {
    async function fetchCouriers() {
      try {
        const res = await fetch("/api/couriers");
        const json = await res.json();
        if (res.ok && json.success) {
          setCouriers(json.data);
        }
      } catch (err) {
        console.error("Erro ao carregar motoboys:", err);
      }
    }
    fetchCouriers();
  }, []);

  // Atalhos de datas
  const setDatePreset = (preset: "today" | "yesterday" | "thisWeek" | "thisMonth" | "clear") => {
    const now = new Date();
    const formatDate = (d: Date) => d.toISOString().split("T")[0];

    if (preset === "clear") {
      setStartDate("");
      setEndDate("");
      return;
    }

    if (preset === "today") {
      const todayStr = formatDate(now);
      setStartDate(todayStr);
      setEndDate(todayStr);
      return;
    }

    if (preset === "yesterday") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = formatDate(y);
      setStartDate(yStr);
      setEndDate(yStr);
      return;
    }

    if (preset === "thisWeek") {
      const first = new Date(now);
      const day = first.getDay();
      const diff = first.getDate() - day + (day === 0 ? -6 : 1); // segunda-feira
      first.setDate(diff);
      setStartDate(formatDate(first));
      setEndDate(formatDate(now));
      return;
    }

    if (preset === "thisMonth") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(formatDate(firstDay));
      setEndDate(formatDate(now));
      return;
    }
  };

  // Buscar corridas e relatório
  const loadSettlement = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCourierId && selectedCourierId !== "ALL") {
        params.set("courierId", selectedCourierId);
      }
      if (paymentStatusFilter && paymentStatusFilter !== "ALL") {
        params.set("paymentStatus", paymentStatusFilter);
      }
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/rides/settlement?${params.toString()}`);
      const json = await res.json();

      if (res.ok && json.success) {
        setRides(json.data.rides);
        setSelectedRideIds([]);
      } else {
        toast.error(json.error || "Erro ao carregar fechamento");
      }
    } catch {
      toast.error("Erro de conexão ao buscar dados de fechamento");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettlement();
  }, [selectedCourierId, paymentStatusFilter, startDate, endDate]);

  // Cálculos consolidados
  const { totalRides, totalPendingAmount, totalPaidAmount, pendingRidesCount } = useMemo(() => {
    let pending = 0;
    let paid = 0;
    let pendingCount = 0;

    for (const r of rides) {
      if (r.paymentStatus === "PENDING") {
        pending += r.courierFee;
        pendingCount++;
      } else if (r.paymentStatus === "PAID") {
        paid += r.courierFee;
      }
    }

    return {
      totalRides: rides.length,
      totalPendingAmount: pending,
      totalPaidAmount: paid,
      pendingRidesCount: pendingCount,
    };
  }, [rides]);

  // Motoboy selecionado atualmente (se houver)
  const currentCourier = useMemo(() => {
    if (selectedCourierId === "ALL") return null;
    return couriers.find((c) => c.id === selectedCourierId) || null;
  }, [couriers, selectedCourierId]);

  // Ações de seleção de checkbox
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRideIds(rides.map((r) => r.id));
    } else {
      setSelectedRideIds([]);
    }
  };

  const handleToggleRide = (id: string) => {
    setSelectedRideIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Liquidar Corridas Selecionadas
  const handleSettleSelected = async (markAsPaid = true) => {
    if (selectedRideIds.length === 0) {
      toast.error("Nenhuma corrida selecionada.");
      return;
    }

    if (
      !confirm(
        `Confirma marcar ${selectedRideIds.length} corrida(s) como ${
          markAsPaid ? "PAGAS" : "PENDENTES"
        }?`
      )
    ) {
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/rides/settlement/pay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rideIds: selectedRideIds,
            markAsPaid,
          }),
        });

        const json = await res.json();
        if (res.ok && json.success) {
          toast.success(json.message);
          loadSettlement();
        } else {
          toast.error(json.error || "Falha ao liquidar corridas");
        }
      } catch {
        toast.error("Erro ao comunicar com o servidor");
      }
    });
  };

  // Liquidar Todas as Pendentes do Motoboy no Período
  const handleSettleAllPending = async () => {
    if (!currentCourier) {
      toast.error("Selecione um motoboy específico para fechar todas as contas.");
      return;
    }

    if (pendingRidesCount === 0) {
      toast.info("Não há corridas pendentes no período para este motoboy.");
      return;
    }

    const confirmMsg = `Deseja fechar e marcar como PAGAS todas as ${pendingRidesCount} corridas pendentes de ${
      currentCourier.name
    } no valor total de ${formatCurrency(totalPendingAmount)}?`;

    if (!confirm(confirmMsg)) return;

    startTransition(async () => {
      try {
        const res = await fetch("/api/rides/settlement/pay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courierId: currentCourier.id,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            markAsPaid: true,
          }),
        });

        const json = await res.json();
        if (res.ok && json.success) {
          toast.success(json.message);
          loadSettlement();
        } else {
          toast.error(json.error || "Falha ao fechar período");
        }
      } catch {
        toast.error("Erro ao comunicar com o servidor");
      }
    });
  };

  // Gerar Texto de Fechamento para WhatsApp
  const handleSendWhatsAppSummary = () => {
    if (!currentCourier) {
      toast.error("Selecione um motoboy específico para enviar o resumo.");
      return;
    }

    const periodStr =
      startDate && endDate
        ? `Período: ${new Date(startDate + "T12:00:00").toLocaleDateString("pt-BR")} até ${new Date(
            endDate + "T12:00:00"
          ).toLocaleDateString("pt-BR")}`
        : "Todas as datas recentes";

    const lines = [
      `🛵 *FECHAMENTO DE FRETES - PINK MUSIC*`,
      `Olá, *${currentCourier.name}*! Segue o resumo dos seus fretes realizados:`,
      ``,
      `📅 *${periodStr}*`,
      `📦 *Total de Corridas:* ${rides.length}`,
      `💰 *Total a Receber:* ${formatCurrency(totalPendingAmount)}`,
      rides.some((r) => r.paymentStatus === "PAID")
        ? `✅ *Já Pago Anteriomente:* ${formatCurrency(totalPaidAmount)}`
        : null,
      ``,
      `*Detalhamento das Corridas:*`,
    ].filter(Boolean);

    rides.slice(0, 25).forEach((r, idx) => {
      const dataStr = new Date(r.assignedAt).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      });
      const statusIcon = r.paymentStatus === "PAID" ? "✅" : "⏳";
      lines.push(
        `${idx + 1}. [${dataStr}] Pedido #${r.order.id.slice(-6).toUpperCase()} - ${
          r.order.customerName.split(" ")[0]
        } (${formatCurrency(r.courierFee)}) ${statusIcon}`
      );
    });

    if (rides.length > 25) {
      lines.push(`... e mais ${rides.length - 25} corrida(s).`);
    }

    if (currentCourier.pixKey) {
      lines.push(``);
      lines.push(`🔑 *Chave Pix informada:* ${currentCourier.pixKey} (${currentCourier.pixKeyType || "Pix"})`);
    }

    lines.push(``);
    lines.push(`Agradecemos pela parceria! Qualquer dúvida estamos à disposição.`);

    const message = encodeURIComponent(lines.join("\n"));
    window.open(`https://wa.me/55${currentCourier.phone}?text=${message}`, "_blank");
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiada com sucesso!`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Topo / Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/couriers"
              className="p-1.5 rounded-lg border hover:bg-muted text-muted-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">
                  Fechamento de Fretes
                </h1>
                <span className="bg-primary/10 text-primary text-xs px-2.5 py-0.5 rounded-full font-bold">
                  Conciliação
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Consulte as corridas realizadas por período e liquide os pagamentos com o motoboy
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="gap-2 border-purple-500/30 text-purple-600 hover:bg-purple-50 hover:text-purple-700 dark:hover:bg-purple-950/40"
            onClick={() => window.print()}
            disabled={rides.length === 0}
            title="Gera o espelho de fretes formatado para salvar em PDF ou imprimir em folha A4"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir / PDF</span>
          </Button>

          {currentCourier && (
            <Button
              variant="outline"
              className="gap-2 border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40"
              onClick={handleSendWhatsAppSummary}
            >
              <MessageCircle className="w-4 h-4" />
              <span>Enviar no WhatsApp</span>
            </Button>
          )}

          <Button
            variant="default"
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleSettleAllPending}
            disabled={isPending || pendingRidesCount === 0 || !currentCourier}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Fechar Todas Pendentes</span>
          </Button>
        </div>
      </div>

      {/* Painel de Filtros */}
      <div className="border rounded-2xl bg-card p-5 space-y-4 shadow-xs print:hidden">
        <div className="flex items-center gap-2 pb-2 border-b border-border/40 text-sm font-semibold">
          <Filter className="w-4 h-4 text-primary" />
          <span>Filtros do Relatório</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Seletor de Motoboy */}
          <div>
            <Label htmlFor="courierSelect" className="text-xs">
              Profissional (Motoboy)
            </Label>
            <select
              id="courierSelect"
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={selectedCourierId}
              onChange={(e) => setSelectedCourierId(e.target.value)}
            >
              <option value="ALL">Todos os Motoboys</option>
              {couriers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.plate ? `(${c.plate})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Status do Pagamento */}
          <div>
            <Label htmlFor="paymentStatusSelect" className="text-xs">
              Status do Pagamento
            </Label>
            <select
              id="paymentStatusSelect"
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={paymentStatusFilter}
              onChange={(e) =>
                setPaymentStatusFilter(
                  e.target.value as "ALL" | "PENDING" | "PAID"
                )
              }
            >
              <option value="ALL">Todas (Pendentes e Pagas)</option>
              <option value="PENDING">Apenas Pendentes (A Pagar)</option>
              <option value="PAID">Apenas Pagas (Liquidadas)</option>
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

        {/* Atalhos de Datas Rápidas */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-muted-foreground flex items-center gap-1 font-medium">
            <Calendar className="w-3.5 h-3.5" /> Atalhos:
          </span>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => setDatePreset("today")}
          >
            Hoje
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => setDatePreset("yesterday")}
          >
            Ontem
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => setDatePreset("thisWeek")}
          >
            Esta Semana
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => setDatePreset("thisMonth")}
          >
            Este Mês
          </Button>
          {(startDate || endDate) && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setDatePreset("clear")}
            >
              Limpar Datas
            </Button>
          )}
        </div>
      </div>

      {/* Cards de Métricas e Pix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        {/* Total de Corridas */}
        <div className="rounded-2xl border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Total de Corridas
            </span>
            <Bike className="w-4 h-4 text-primary" />
          </div>
          <div className="text-3xl font-extrabold">{totalRides}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Entregas encontradas no período
          </p>
        </div>

        {/* A Pagar (Pendentes) */}
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 shadow-xs">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Pendente a Pagar
            </span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">
            {formatCurrency(totalPendingAmount)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {pendingRidesCount} corrida(s) aguardando acerto
          </p>
        </div>

        {/* Já Liquidado */}
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 shadow-xs">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Total Liquidado
            </span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(totalPaidAmount)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Corridas pagas com comprovante
          </p>
        </div>

        {/* Dados do Pix do Motoboy */}
        <div className="rounded-2xl border bg-card p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Pagamento Pix
              </span>
              <CreditCard className="w-4 h-4 text-primary" />
            </div>
            {currentCourier?.pixKey ? (
              <div className="mt-1">
                <span className="text-xs text-muted-foreground block">
                  Tipo: {currentCourier.pixKeyType || "Chave"}
                </span>
                <span className="font-mono font-semibold text-sm truncate block mt-0.5">
                  {currentCourier.pixKey}
                </span>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground mt-2">
                {currentCourier
                  ? "Chave Pix não cadastrada"
                  : "Selecione um motoboy para ver a chave Pix"}
              </div>
            )}
          </div>

          {currentCourier?.pixKey && (
            <Button
              size="sm"
              variant="outline"
              className="mt-2 text-xs gap-1.5 h-8 border-primary/30 text-primary hover:bg-primary/10"
              onClick={() =>
                copyToClipboard(currentCourier.pixKey!, "Chave Pix")
              }
            >
              <Copy className="w-3.5 h-3.5" />
              Copiar Chave Pix
            </Button>
          )}
        </div>
      </div>

      {/* Tabela de Corridas (Visualização em tela) */}
      <div className="border rounded-2xl bg-card overflow-hidden shadow-xs print:hidden">
        {/* Barra superior de ações da tabela */}
        <div className="p-4 bg-muted/20 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-primary" />
            <h3 className="font-bold text-sm">Extrato das Corridas</h3>
            <span className="text-xs text-muted-foreground">
              ({rides.length} registro(s))
            </span>
          </div>

          {selectedRideIds.length > 0 && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-medium text-muted-foreground">
                {selectedRideIds.length} selecionada(s)
              </span>
              <Button
                size="sm"
                className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                onClick={() => handleSettleSelected(true)}
                disabled={isPending}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Marcar como Pagas
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 text-xs text-muted-foreground"
                onClick={() => handleSettleSelected(false)}
                disabled={isPending}
              >
                Reverter para Pendente
              </Button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
            <p className="text-sm text-muted-foreground">Carregando extrato de fretes...</p>
          </div>
        ) : rides.length === 0 ? (
          <div className="py-16 text-center">
            <Bike className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="font-semibold text-sm">Nenhuma corrida encontrada</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tente alterar os filtros de data, status ou motoboy.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="p-3 w-10 text-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                      checked={
                        rides.length > 0 &&
                        selectedRideIds.length === rides.length
                      }
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </th>
                  <th className="p-3">Data / Hora</th>
                  <th className="p-3">Pedido</th>
                  <th className="p-3">Motoboy</th>
                  <th className="p-3">Cliente / Destino</th>
                  <th className="p-3 text-right">Frete Cliente</th>
                  <th className="p-3 text-right font-bold">Valor Motoboy</th>
                  <th className="p-3 text-center">Status Pagto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {rides.map((ride) => {
                  const isSelected = selectedRideIds.includes(ride.id);
                  const isPaid = ride.paymentStatus === "PAID";
                  const dateStr = new Date(ride.assignedAt).toLocaleString(
                    "pt-BR",
                    {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  );

                  return (
                    <tr
                      key={ride.id}
                      className={`hover:bg-muted/30 transition-colors ${
                        isSelected ? "bg-primary/5" : ""
                      }`}
                    >
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                          checked={isSelected}
                          onChange={() => handleToggleRide(ride.id)}
                        />
                      </td>

                      <td className="p-3 whitespace-nowrap text-muted-foreground">
                        {dateStr}
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        <Link
                          href={`/dashboard/orders`}
                          className="font-mono font-bold text-primary hover:underline flex items-center gap-1"
                        >
                          #{ride.order.id.slice(-6).toUpperCase()}
                          <ExternalLink className="w-2.5 h-2.5" />
                        </Link>
                      </td>

                      <td className="p-3 whitespace-nowrap font-medium">
                        {ride.courier.name}
                      </td>

                      <td className="p-3">
                        <div className="font-semibold text-foreground truncate max-w-[180px]">
                          {ride.order.customerName}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate max-w-[220px]">
                          {ride.order.deliveryAddress || "Endereço no pedido"}
                        </div>
                      </td>

                      <td className="p-3 text-right text-muted-foreground whitespace-nowrap">
                        {formatCurrency(ride.clientFee)}
                      </td>

                      <td className="p-3 text-right font-bold text-foreground text-sm whitespace-nowrap">
                        {formatCurrency(ride.courierFee)}
                      </td>

                      <td className="p-3 text-center whitespace-nowrap">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" /> PAGO
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            <Clock className="w-3 h-3" /> PENDENTE
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
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
              Comércio de Instrumentos Musicais & Acessórios
            </p>
          </div>
          <div className="text-right">
            <h2 className="text-sm font-bold uppercase tracking-wider">
              Fechamento de Fretes / Entregas
            </h2>
            <p className="text-[11px] text-gray-600">
              Emitido em: {new Date().toLocaleString("pt-BR")}
            </p>
          </div>
        </div>

        {/* Ficha Resumo do Motoboy & Período */}
        <div className="grid grid-cols-2 gap-4 border border-gray-400 rounded p-3 text-xs bg-gray-50/60">
          <div className="space-y-1">
            <p>
              <strong className="text-gray-900">Entregador:</strong>{" "}
              {currentCourier ? currentCourier.name : "Todos os Motoboys"}
            </p>
            {currentCourier?.phone && (
              <p>
                <strong className="text-gray-900">WhatsApp:</strong>{" "}
                {currentCourier.phone}
              </p>
            )}
            {currentCourier?.vehicle && (
              <p>
                <strong className="text-gray-900">Veículo / Placa:</strong>{" "}
                {currentCourier.vehicle}{" "}
                {currentCourier.plate ? `(${currentCourier.plate})` : ""}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <p>
              <strong className="text-gray-900">Período:</strong>{" "}
              {startDate && endDate
                ? `${new Date(startDate + "T12:00:00").toLocaleDateString(
                    "pt-BR"
                  )} até ${new Date(endDate + "T12:00:00").toLocaleDateString(
                    "pt-BR"
                  )}`
                : "Todas as datas recentes"}
            </p>
            {currentCourier?.pixKey && (
              <p>
                <strong className="text-gray-900">
                  Chave Pix ({currentCourier.pixKeyType || "Pix"}):
                </strong>{" "}
                {currentCourier.pixKey}
              </p>
            )}
            <p>
              <strong className="text-gray-900">Filtro de Status:</strong>{" "}
              {paymentStatusFilter === "ALL"
                ? "Todas as corridas"
                : paymentStatusFilter === "PENDING"
                ? "Apenas Pendentes (A Pagar)"
                : "Apenas Pagas (Liquidadas)"}
            </p>
          </div>
        </div>

        {/* Tabela Formatada para Impressão */}
        <table className="w-full text-left text-xs border border-gray-400 mt-2">
          <thead className="bg-gray-100 border-b border-gray-400 font-bold uppercase text-[10px]">
            <tr>
              <th className="p-2 border-r border-gray-300 text-center w-8">#</th>
              <th className="p-2 border-r border-gray-300 w-28">Data / Hora</th>
              <th className="p-2 border-r border-gray-300 w-24">Pedido</th>
              <th className="p-2 border-r border-gray-300">Motoboy</th>
              <th className="p-2 border-r border-gray-300">Cliente / Destino</th>
              <th className="p-2 text-right border-r border-gray-300 w-24">Valor Frete</th>
              <th className="p-2 text-center w-20">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {rides.map((ride, idx) => (
              <tr
                key={ride.id}
                className={idx % 2 === 0 ? "bg-white" : "bg-gray-50/80"}
              >
                <td className="p-2 border-r border-gray-300 text-center font-mono">
                  {idx + 1}
                </td>
                <td className="p-2 border-r border-gray-300 whitespace-nowrap">
                  {new Date(ride.assignedAt).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="p-2 border-r border-gray-300 font-mono font-bold">
                  #{ride.order.id.slice(-6).toUpperCase()}
                </td>
                <td className="p-2 border-r border-gray-300">{ride.courier.name}</td>
                <td className="p-2 border-r border-gray-300">
                  <div className="font-semibold text-gray-900">
                    {ride.order.customerName}
                  </div>
                  <div className="text-[10px] text-gray-600 line-clamp-1">
                    {ride.order.deliveryAddress || "Endereço no pedido"}
                  </div>
                </td>
                <td className="p-2 border-r border-gray-300 text-right font-bold whitespace-nowrap text-sm">
                  {formatCurrency(ride.courierFee)}
                </td>
                <td className="p-2 text-center font-bold text-[10px] whitespace-nowrap">
                  {ride.paymentStatus === "PAID" ? "PAGO" : "PENDENTE"}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-100 font-bold border-t-2 border-gray-400">
            <tr>
              <td colSpan={5} className="p-2 text-right uppercase text-[11px]">
                Total Geral ({rides.length} corridas)
              </td>
              <td className="p-2 text-right font-black text-sm border-r border-gray-300">
                {formatCurrency(totalPendingAmount + totalPaidAmount)}
              </td>
              <td className="p-2 text-center text-[10px]">
                {rides.length} corridas
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Resumo Financeiro em Caixa */}
        <div className="flex justify-end pt-2">
          <div className="w-80 border-2 border-gray-400 p-3 rounded bg-gray-50 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span>Total de Corridas Realizadas:</span>
              <strong>{rides.length}</strong>
            </div>
            <div className="flex justify-between">
              <span>Total Já Liquidado (Pago):</span>
              <span className="font-semibold">{formatCurrency(totalPaidAmount)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-300 pt-1 text-sm font-black">
              <span>Total Pendente a Pagar:</span>
              <span className="text-black">{formatCurrency(totalPendingAmount)}</span>
            </div>
          </div>
        </div>

        {/* Campo de Assinaturas */}
        <div className="pt-12 grid grid-cols-2 gap-16 text-center text-xs">
          <div>
            <div className="border-t border-black pt-1 font-bold">
              {currentCourier ? currentCourier.name : "Assinatura do Entregador"}
            </div>
            <span className="text-[10px] text-gray-600">
              Entregador / Prestador de Serviço
            </span>
          </div>

          <div>
            <div className="border-t border-black pt-1 font-bold">
              Pink Music — Gestão de Fretes
            </div>
            <span className="text-[10px] text-gray-600">
              Visto do Responsável
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
