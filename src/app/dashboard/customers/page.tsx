"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Users,
  Search,
  ShoppingBag,
  Phone,
  Mail,
  DollarSign,
  Package,
  AlertCircle,
  Truck,
  Store,
} from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";
import { toast } from "sonner";

interface CustomerOrder {
  id: string;
  totalAmount: number;
  status: string;
  createdAt: string;
}

interface Customer {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: string;
  createdAt: string;
  totalOrders: number;
  totalSpent: number;
  orders: CustomerOrder[];
}

interface OrderItemDetail {
  id: string;
  title: string;
  price: number;
  quantity: number;
  thumbnail?: string | null;
  productCode?: string | null;
}

interface CustomerFullDetails extends Customer {
  orders: Array<
    CustomerOrder & {
      deliveryType?: string;
      deliveryAddress?: string | null;
      deliveryFee?: number;
      product?: { id: string; title: string; thumbnail?: string | null };
      items?: OrderItemDetail[];
    }
  >;
}

export default function CustomersPage() {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerDetails, setCustomerDetails] = useState<CustomerFullDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/users?type=customers");
      if (!response.ok) {
        throw new Error("Falha ao buscar clientes.");
      }
      const data = await response.json();
      setCustomers(data);
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
      toast.error("Erro ao carregar a lista de clientes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const openCustomerDetails = async (id: string) => {
    setSelectedCustomerId(id);
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/dashboard/customers/${id}`);
      if (!res.ok) throw new Error("Erro ao buscar pedidos do cliente.");
      const data = await res.json();
      setCustomerDetails(data);
    } catch (error) {
      console.error("Erro ao abrir histórico do cliente:", error);
      toast.error("Não foi possível carregar os pedidos do cliente.");
    } finally {
      setLoadingDetails(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return customers;
    return customers.filter(
      (c) =>
        (c.name && c.name.toLowerCase().includes(term)) ||
        c.email.toLowerCase().includes(term) ||
        (c.phone && c.phone.includes(term))
    );
  }, [customers, searchTerm]);

  const metrics = useMemo(() => {
    const total = customers.length;
    const withOrders = customers.filter((c) => c.totalOrders > 0).length;
    const totalRevenue = customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0);
    return { total, withOrders, totalRevenue };
  }, [customers]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val || 0);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">Pago</Badge>;
      case "PREPARING":
        return <Badge className="bg-amber-100 text-amber-800 border-amber-300">Separando</Badge>;
      case "DISPATCHED":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Em Rota / Despachado</Badge>;
      case "DELIVERED":
        return <Badge className="bg-green-100 text-green-800 border-green-300">Entregue</Badge>;
      case "CANCELLED":
        return <Badge className="bg-red-100 text-red-800 border-red-300">Cancelado</Badge>;
      default:
        return <Badge variant="outline">Aguardando Pagamento</Badge>;
    }
  };

  const getCleanPhone = (phone?: string | null) => {
    if (!phone) return "";
    return phone.replace(/\D/g, "");
  };

  return (
    <div className="space-y-6 pt-2 md:pt-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="h-7 w-7 text-primary" />
            Clientes da Loja
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Consulte a carteira de clientes, dados de contato e histórico de compras.
          </p>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card/50 border-border/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Clientes Cadastrados
              </p>
              <p className="text-2xl font-bold text-foreground mt-1">{metrics.total}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Clientes Com Compras
              </p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {metrics.withOrders}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <ShoppingBag className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total Gasto por Clientes
              </p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {formatCurrency(metrics.totalRevenue)}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Clientes */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Base de Clientes</CardTitle>
            <CardDescription>
              {filteredCustomers.length} {filteredCustomers.length === 1 ? "cliente encontrado" : "clientes encontrados"}
            </CardDescription>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingState label="Carregando clientes..." className="min-h-[220px]" />
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground/60 mb-2" />
              <p className="font-medium">Nenhum cliente cadastrado ou encontrado.</p>
              {searchTerm && <p className="text-xs mt-1">Tente ajustar o termo de pesquisa.</p>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>WhatsApp / Telefone</TableHead>
                    <TableHead className="text-center">Pedidos</TableHead>
                    <TableHead>Total Gasto</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => {
                    const cleanPhone = getCleanPhone(customer.phone);
                    const whatsappUrl = cleanPhone
                      ? `https://wa.me/55${cleanPhone}`
                      : null;

                    return (
                      <TableRow key={customer.id} className="hover:bg-muted/40">
                        <TableCell className="font-medium text-foreground">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs">
                              {customer.name?.slice(0, 2).toUpperCase() || "CL"}
                            </div>
                            <span>{customer.name || "Cliente sem nome"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <div className="flex items-center gap-1.5 text-xs">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground/60" />
                            {customer.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          {customer.phone ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">{customer.phone}</span>
                              {whatsappUrl && (
                                <a
                                  href={whatsappUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 transition-colors"
                                  title="Abrir conversa no WhatsApp"
                                >
                                  <Phone className="h-3 w-3" />
                                  WhatsApp
                                </a>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground/60">Não informado</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={customer.totalOrders > 0 ? "secondary" : "outline"} className="font-semibold">
                            {customer.totalOrders} {customer.totalOrders === 1 ? "pedido" : "pedidos"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold text-foreground">
                          {formatCurrency(customer.totalSpent)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(customer.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openCustomerDetails(customer.id)}
                            className="flex items-center gap-1.5 text-xs"
                          >
                            <ShoppingBag className="h-3.5 w-3.5 text-primary" />
                            Ver Pedidos
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalhes e Pedidos do Cliente */}
      <Dialog
        open={!!selectedCustomerId}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedCustomerId(null);
            setCustomerDetails(null);
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Users className="h-5 w-5 text-primary" />
              Histórico de Compras do Cliente
            </DialogTitle>
            <DialogDescription>
              {customerDetails?.name} ({customerDetails?.email})
            </DialogDescription>
          </DialogHeader>

          {loadingDetails ? (
            <LoadingState label="Carregando pedidos..." className="min-h-[200px]" />
          ) : !customerDetails ? (
            <p className="text-center py-6 text-muted-foreground">Não foi possível carregar os detalhes.</p>
          ) : (
            <div className="space-y-6 mt-2">
              {/* Resumo do Cliente */}
              <div className="bg-muted/40 p-3 rounded-lg border text-sm grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-xs text-muted-foreground block">WhatsApp:</span>
                  <span className="font-medium">{customerDetails.phone || "Não informado"}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Total de Compras:</span>
                  <span className="font-medium">{customerDetails.orders.length} pedidos</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Cliente Desde:</span>
                  <span className="font-medium">{formatDate(customerDetails.createdAt)}</span>
                </div>
              </div>

              {/* Lista de Pedidos */}
              <div>
                <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  Pedidos Realizados
                </h3>

                {customerDetails.orders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                    <ShoppingBag className="h-8 w-8 mx-auto text-muted-foreground/60 mb-1" />
                    <p className="text-sm font-medium">Este cliente ainda não realizou nenhum pedido no site.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {customerDetails.orders.map((order) => (
                      <div
                        key={order.id}
                        className="p-4 rounded-lg border bg-card hover:border-primary/40 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-muted-foreground">
                              #{order.id.slice(0, 8)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(order.createdAt).toLocaleString("pt-BR")}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(order.status)}
                            <span className="font-bold text-foreground text-sm">
                              {formatCurrency(order.totalAmount)}
                            </span>
                          </div>
                        </div>

                        {/* Itens do pedido */}
                        <div className="text-xs space-y-1 mt-2">
                          {order.items && order.items.length > 0 ? (
                            order.items.map((it) => (
                              <div key={it.id} className="flex justify-between items-center text-muted-foreground">
                                <span>
                                  {it.quantity}x {it.title}
                                </span>
                                <span className="font-medium text-foreground">
                                  {formatCurrency(it.price * it.quantity)}
                                </span>
                              </div>
                            ))
                          ) : order.product ? (
                            <div className="flex justify-between items-center text-muted-foreground">
                              <span>1x {order.product.title}</span>
                              <span className="font-medium text-foreground">
                                {formatCurrency(order.totalAmount)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic">Detalhes dos itens não disponíveis</span>
                          )}

                          {order.deliveryType && (
                            <div className="mt-2 pt-2 border-t text-[11px] text-muted-foreground flex items-center gap-1.5">
                              {order.deliveryType === "delivery" ? (
                                <>
                                  <Truck className="h-3.5 w-3.5 text-blue-500" />
                                  <span>Entrega Local Uber Direct</span>
                                  {order.deliveryAddress && <span>— {order.deliveryAddress}</span>}
                                </>
                              ) : (
                                <>
                                  <Store className="h-3.5 w-3.5 text-emerald-500" />
                                  <span>Retirada na Loja Física</span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
