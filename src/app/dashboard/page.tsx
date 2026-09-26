"use client";

import React, { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardMetricCard } from "@/app/dashboard/_components/metric-card";
import Link from "next/link";
import {
  DollarSign,
  ShoppingBag,
  Clock,
  Truck,
  Users,
  Package,
  ShieldCheck,
  Briefcase,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";

interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  paidOrdersCount: number;
  pendingOrdersCount: number;
  preparingOrdersCount: number;
  dispatchedOrdersCount: number;
  deliveredOrdersCount: number;
  totalCustomers: number;
  totalProducts: number;
}

export default function OverviewPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/dashboard/stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats);
        }
      } catch (error) {
        console.error("Erro ao carregar estatísticas do dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val || 0);
  };

  const isAdmin = user?.role === "ADMIN";
  const isEmployee = user?.role === "EMPLOYEE" || user?.role === "FUNCIONARIO";

  return (
    <div className="space-y-6 pt-2 md:pt-0">
      {/* Top Banner de Boas-vindas */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 rounded-2xl border border-primary/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
              Olá, {user?.name || "Usuário"}!
            </h1>
            {isAdmin ? (
              <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300 font-semibold gap-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                Administrador
              </Badge>
            ) : isEmployee ? (
              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 font-semibold gap-1">
                <Briefcase className="h-3.5 w-3.5" />
                Funcionário - Vendas & Pedidos
              </Badge>
            ) : null}
          </div>
          <p className="text-muted-foreground text-sm">
            {isAdmin
              ? "Acompanhe as vendas, clientes, pedidos e gerencie toda a operação da Pink Music."
              : "Você tem acesso ao gerenciamento de pedidos, vendas e atendimento a clientes."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/dashboard/orders">
            <Button className="flex items-center gap-2 font-medium">
              <ShoppingBag className="h-4 w-4" />
              Ver Pedidos & Vendas
            </Button>
          </Link>
        </div>
      </div>

      {/* Cards de Métricas Principais */}
      {loading ? (
        <LoadingState label="Carregando indicadores..." className="min-h-[180px]" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <DashboardMetricCard
            label="Faturamento Vendas"
            value={formatCurrency(stats?.totalRevenue || 0)}
            helperText="Vendas confirmadas e concluídas"
            icon={<DollarSign className="h-5 w-5" />}
            iconClassName="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900"
            valueClassName="text-emerald-600 dark:text-emerald-400"
          />

          <DashboardMetricCard
            label="Total de Pedidos"
            value={stats?.totalOrders || 0}
            helperText={`${(stats?.paidOrdersCount || 0) + (stats?.deliveredOrdersCount || 0)} pedidos pagos`}
            icon={<ShoppingBag className="h-5 w-5" />}
            iconClassName="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900"
          />

          <DashboardMetricCard
            label="Para Enviar / Preparar"
            value={(stats?.paidOrdersCount || 0) + (stats?.preparingOrdersCount || 0)}
            helperText="Aguardando despacho ou entrega"
            icon={<Clock className="h-5 w-5" />}
            iconClassName="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900"
            valueClassName="text-amber-600 dark:text-amber-400"
          />

          <DashboardMetricCard
            label="Clientes do Site"
            value={stats?.totalCustomers || 0}
            helperText="Base de clientes cadastrados"
            icon={<Users className="h-5 w-5" />}
            iconClassName="bg-primary/10 text-primary border-primary/20"
          />
        </div>
      )}

      {/* Ações Rápidas Operacionais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Painel de Pedidos */}
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
              Pedidos & Vendas
            </CardTitle>
            <CardDescription>
              Visualize os pedidos PIX em tempo real, atualize status de separação e acione entregas locais Uber Direct.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm p-3 bg-muted/40 rounded-lg">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  Pagamento Pendente
                </span>
                <span className="font-bold">{stats?.pendingOrdersCount || 0}</span>
              </div>
              <div className="flex justify-between items-center text-sm p-3 bg-muted/40 rounded-lg">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Package className="h-4 w-4 text-emerald-500" />
                  Prontos para Preparação
                </span>
                <span className="font-bold">{stats?.paidOrdersCount || 0}</span>
              </div>
              <div className="flex justify-between items-center text-sm p-3 bg-muted/40 rounded-lg">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Truck className="h-4 w-4 text-blue-500" />
                  Em Trânsito / Despachados
                </span>
                <span className="font-bold">{stats?.dispatchedOrdersCount || 0}</span>
              </div>
            </div>

            <div className="mt-4">
              <Link href="/dashboard/orders">
                <Button variant="outline" className="w-full flex items-center justify-center gap-2">
                  Acessar Gestão de Pedidos
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Painel de Clientes e Pessoas */}
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Gestão de Pessoas
            </CardTitle>
            <CardDescription>
              Acompanhe os clientes compradores da loja e a equipe com acesso ao sistema.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 bg-muted/40 rounded-lg flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Clientes da Loja</p>
                  <p className="text-xs text-muted-foreground">
                    Consulte contatos, WhatsApp e histórico de pedidos.
                  </p>
                </div>
                <Link href="/dashboard/customers">
                  <Button size="sm" variant="secondary">
                    Ver Clientes
                  </Button>
                </Link>
              </div>

              {isAdmin && (
                <div className="p-3 bg-muted/40 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Equipe do Sistema</p>
                    <p className="text-xs text-muted-foreground">
                      Cadastre administradores e funcionários.
                    </p>
                  </div>
                  <Link href="/dashboard/users">
                    <Button size="sm" variant="secondary">
                      Gerenciar Equipe
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
