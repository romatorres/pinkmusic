"use client";

import React, { useState, useEffect, use } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  Copy,
  Check,
  Truck,
  Store,
  QrCode,
  RefreshCw,
  ExternalLink,
  MessageCircle,
  Package,
  LogIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/Page-container";
import { OrderStatus, type OrderStatusType } from "@/components/site/_components/OrderStatus";
import { useAuthStore } from "@/store/authStore";
import { CustomerAuthModal } from "@/components/site/_components/CustomerAuthModal";
import { toast } from "sonner";

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
  status: OrderStatusType;
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

const formatPrice = (price: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price);

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { isAuth } = useAuthStore();

  const [order, setOrder] = useState<CustomerOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const fetchOrder = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/customer/orders/${id}`);
      if (res.status === 401) {
        setLoading(false);
        return;
      }
      if (res.status === 404) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.success) {
        setOrder(data.data);
      } else {
        setNotFound(true);
      }
    } catch {
      toast.error("Erro ao carregar pedido.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuth) {
      fetchOrder();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuth, id]);

  const handleCopyPix = () => {
    if (!order?.mpQrCode) return;
    navigator.clipboard.writeText(order.mpQrCode);
    setCopied(true);
    toast.success("Código PIX copiado!");
    setTimeout(() => setCopied(false), 2500);
  };

  // — Não autenticado —
  if (!isAuth && !loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
        <div className="max-w-sm w-full text-center">
          <div className="size-16 rounded-2xl bg-secondary text-primary flex items-center justify-center mx-auto mb-4">
            <LogIn className="size-8" />
          </div>
          <h1 className="text-xl font-bold">Identifique-se para ver seu pedido</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Faça login para visualizar os detalhes e o status de acompanhamento.
          </p>
          <Button className="mt-6 w-full h-11 rounded-xl font-bold" onClick={() => setAuthModalOpen(true)}>
            Entrar ou Criar Conta
          </Button>
          <CustomerAuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} onSuccess={fetchOrder} />
        </div>
      </div>
    );
  }

  // — Carregando —
  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <RefreshCw className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  // — Não encontrado —
  if (notFound || !order) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4 py-12 px-4 text-center">
        <div className="size-16 rounded-2xl bg-secondary text-primary flex items-center justify-center mx-auto">
          <Package className="size-8" />
        </div>
        <h1 className="text-xl font-bold">Pedido não encontrado</h1>
        <p className="text-sm text-muted-foreground">Este pedido não existe ou não pertence à sua conta.</p>
        <Button asChild variant="outline" className="rounded-xl">
          <Link href="/meus-pedidos">Ver meus pedidos</Link>
        </Button>
      </div>
    );
  }

  const isDelivery = order.deliveryType === "delivery";
  const isPendingPayment = order.status === "PENDING_PAYMENT";
  const isPaid = order.status !== "PENDING_PAYMENT" && order.status !== "CANCELLED";

  const allItems =
    order.items && order.items.length > 0
      ? order.items
      : order.product
      ? [{ id: "legacy", productId: order.product.id, title: order.product.title, price: order.totalAmount, quantity: 1, thumbnail: order.product.thumbnail, productCode: order.product.code ?? null }]
      : [];

  return (
    <div className="min-h-[80vh] py-8 md:py-12">
      <PageContainer className="max-w-4xl mx-auto">
        {/* Navegação */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/meus-pedidos"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Meus Pedidos
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchOrder}
            disabled={loading}
            className="h-8 rounded-xl text-xs gap-1.5"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        {/* Cabeçalho do Pedido */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <h1 className="text-3xl font-extrabold md:text-4xl font-display">
            Pedido #{order.id.slice(-8).toUpperCase()}
          </h1>
          <OrderStatus status={order.status} deliveryType={order.deliveryType} compact />
        </div>

        {/* Grid principal: 2 colunas no desktop */}
        <div className="grid gap-6 md:grid-cols-[1fr_360px]">
          {/* Coluna esquerda: PIX ou confirmado + Itens */}
          <div className="space-y-6">
            {/* Bloco de Pagamento */}
            {isPendingPayment ? (
              <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 text-center">
                <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-300 mb-4">
                  <Clock className="size-3.5" />
                  Aguardando pagamento via PIX
                </div>
                <div className="text-xs text-muted-foreground">Valor total</div>
                <div className="font-display text-4xl font-extrabold tabular mt-1">
                  {formatPrice(order.totalAmount)}
                </div>

                {order.mpQrCodeBase64 ? (
                  <>
                    <div className="mx-auto mt-5 w-fit rounded-2xl border bg-white p-4 shadow-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`data:image/png;base64,${order.mpQrCodeBase64}`}
                        alt="QR Code PIX"
                        className="w-48 h-48 object-contain"
                      />
                    </div>
                    <p className="mt-4 text-sm text-muted-foreground max-w-xs mx-auto">
                      Abra o app do seu banco, escolha PIX e escaneie o QR Code — ou use o código Copia e Cola.
                    </p>
                  </>
                ) : (
                  <div className="mx-auto mt-5 w-fit rounded-2xl border bg-muted p-8">
                    <QrCode className="size-16 text-muted-foreground" />
                    <p className="mt-2 text-xs text-muted-foreground">QR Code sendo gerado...</p>
                  </div>
                )}

                {order.mpQrCode && (
                  <>
                    <div className="mt-4 break-all rounded-xl bg-muted/60 border p-3 text-left font-mono text-[11px] text-muted-foreground max-h-24 overflow-y-auto">
                      {order.mpQrCode}
                    </div>
                    <Button
                      size="lg"
                      className="mt-4 w-full text-sm font-bold rounded-xl"
                      onClick={handleCopyPix}
                    >
                      {copied ? (
                        <><Check className="size-4" /> Código PIX copiado!</>
                      ) : (
                        <><Copy className="size-4" /> Copiar código PIX</>
                      )}
                    </Button>
                  </>
                )}
              </section>
            ) : isPaid ? (
              <section className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center">
                <CheckCircle2 className="mx-auto size-12 text-emerald-500 mb-3" />
                <h2 className="text-xl font-bold text-foreground">Pagamento confirmado</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Obrigado! Já estamos cuidando do seu pedido.
                </p>
                <div className="mt-3 font-display text-3xl font-extrabold tabular text-foreground">
                  {formatPrice(order.totalAmount)}
                </div>
                {order.paidAt && (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Pago em{" "}
                    {new Date(order.paidAt).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}
              </section>
            ) : null}

            {/* Itens do pedido */}
            <section className="rounded-2xl border bg-card p-5">
              <h2 className="text-base font-bold mb-4">Itens do pedido</h2>
              <div className="space-y-3">
                {allItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="relative size-14 rounded-xl overflow-hidden bg-muted shrink-0 border">
                      {item.thumbnail ? (
                        <Image src={item.thumbnail} alt={item.title} fill className="object-contain p-1" />
                      ) : (
                        <Package className="size-6 text-muted-foreground m-auto" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-2 leading-snug">{item.title}</p>
                      {item.productCode && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">Cód: {item.productCode}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold">{formatPrice(item.price * item.quantity)}</p>
                      <p className="text-[11px] text-muted-foreground">{item.quantity}x {formatPrice(item.price)}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totais */}
              <div className="mt-4 pt-4 border-t space-y-1.5 text-sm">
                {order.deliveryFee > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Frete</span>
                    <span>{formatPrice(order.deliveryFee)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span>{formatPrice(order.totalAmount)}</span>
                </div>
              </div>

              {/* Entrega */}
              <div className="mt-4 pt-4 border-t flex items-start gap-2 text-sm text-muted-foreground">
                {isDelivery ? (
                  <>
                    <Truck className="size-4 text-primary shrink-0 mt-0.5" />
                    <span>Entrega local em Feira de Santana{order.deliveryAddress ? `: ${order.deliveryAddress}` : ""}</span>
                  </>
                ) : (
                  <>
                    <Store className="size-4 text-primary shrink-0 mt-0.5" />
                    <span>Retirada no balcão — Rua Visconde de Mauá 136, Feira de Santana – BA</span>
                  </>
                )}
              </div>
            </section>

            {/* Rastreio Uber (se houver) */}
            {order.uberTrackingUrl && (
              <section className="rounded-2xl border bg-card p-5">
                <h2 className="text-base font-bold mb-3">Rastreio da entrega</h2>
                {order.uberCourierName && (
                  <p className="text-sm text-muted-foreground mb-3">
                    Entregador: <strong className="text-foreground">{order.uberCourierName}</strong>
                    {order.uberCourierPhone && (
                      <a href={`tel:${order.uberCourierPhone}`} className="ml-2 text-primary underline-offset-2 hover:underline">
                        {order.uberCourierPhone}
                      </a>
                    )}
                  </p>
                )}
                <Button asChild variant="outline" className="w-full rounded-xl gap-2">
                  <a href={order.uberTrackingUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-4" />
                    Rastrear no Uber Direct
                  </a>
                </Button>
              </section>
            )}
          </div>

          {/* Coluna direita: Acompanhamento + Contato */}
          <div className="space-y-6">
            {/* Bloco de Acompanhamento */}
            <section className="rounded-2xl border bg-card p-5">
              <h2 className="text-base font-bold mb-5">Acompanhamento</h2>
              <OrderStatus
                status={order.status}
                deliveryType={order.deliveryType}
              />
            </section>

            {/* Informações do pedido */}
            <section className="rounded-2xl border bg-card p-5 text-sm space-y-3">
              <h2 className="text-base font-bold">Informações</h2>
              <div className="flex justify-between text-muted-foreground">
                <span>Número do pedido</span>
                <span className="font-mono font-medium text-foreground">#{order.id.slice(-8).toUpperCase()}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Data do pedido</span>
                <span className="text-foreground">
                  {new Date(order.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Nome</span>
                <span className="text-foreground">{order.customerName}</span>
              </div>
            </section>

            {/* Contato via WhatsApp */}
            <a
              href={`https://wa.me/5575${order.customerPhone?.replace(/\D/g, "").slice(-9)}?text=${encodeURIComponent(`Olá! Tenho dúvidas sobre o pedido #${order.id.slice(-8).toUpperCase()}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-2xl border bg-card p-4 hover:border-primary/40 hover:bg-primary/5 transition-colors group"
            >
              <div className="size-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                <MessageCircle className="size-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold group-hover:text-primary transition-colors">Falar com a loja</p>
                <p className="text-xs text-muted-foreground">Dúvidas? Entre em contato pelo WhatsApp</p>
              </div>
            </a>
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
