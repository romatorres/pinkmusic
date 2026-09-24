"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Store,
  CheckCircle,
  Copy,
  Check,
  MessageCircle,
  Truck,
  Loader2,
  QrCode,
  XCircle,
  Clock,
  MapPin,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { Product } from "@/lib/types";

interface PixCheckoutModalProps {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "form" | "qrcode" | "confirmed" | "expired";

interface OrderData {
  orderId: string;
  mpPaymentId: string;
  qrCode: string;
  qrCodeBase64: string;
  totalAmount: number;
  expiresAt: string;
}

const POLLING_INTERVAL_MS = 5000; // 5 segundos
const PIX_DURATION_MS = 30 * 60 * 1000; // 30 minutos

function formatPrice(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function useCountdown(expiresAt: string | null) {
  const [remaining, setRemaining] = useState(PIX_DURATION_MS);

  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      setRemaining(Math.max(0, diff));
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  const expired = remaining === 0;
  return { minutes, seconds, expired };
}

export default function PixCheckoutModal({
  product,
  open,
  onOpenChange,
}: PixCheckoutModalProps) {
  // Form state
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [deliveryType, setDeliveryType] = useState<"pickup" | "delivery">("pickup");
  const [address, setAddress] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [complement, setComplement] = useState("");
  const [zipCode, setZipCode] = useState("");

  // Cotação de frete
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteFetched, setQuoteFetched] = useState(false);
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | null>(null);
  const [quotePackageSize, setQuotePackageSize] = useState<string | null>(null);

  // Flow state
  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [copied, setCopied] = useState(false);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { minutes, seconds, expired } = useCountdown(
    step === "qrcode" ? orderData?.expiresAt ?? null : null
  );

  // Helper para endereço completo e legível
  const getFullAddress = useCallback(() => {
    const parts = [address.trim()];
    if (neighborhood.trim()) parts.push(`Bairro ${neighborhood.trim()}`);
    if (complement.trim()) parts.push(complement.trim());
    return parts.filter(Boolean).join(", ");
  }, [address, neighborhood, complement]);

  // Invalida cotação se endereço for alterado
  const invalidateQuote = useCallback(() => {
    if (quoteFetched) {
      setQuoteFetched(false);
      setDeliveryFee(0);
      setEstimatedMinutes(null);
      setQuoteError(null);
    }
  }, [quoteFetched]);

  // Reset ao fechar
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep("form");
        setName("");
        setWhatsapp("");
        setDeliveryType("pickup");
        setAddress("");
        setNeighborhood("");
        setComplement("");
        setZipCode("");
        setOrderData(null);
        setCopied(false);
        setDeliveryFee(0);
        setQuoteLoading(false);
        setQuoteError(null);
        setQuoteFetched(false);
        setEstimatedMinutes(null);
      }, 300);
    }
  }, [open]);

  // Quando troca para retirada, limpa cotação
  const handleDeliveryTypeChange = (type: "pickup" | "delivery") => {
    setDeliveryType(type);
    if (type === "pickup") {
      setDeliveryFee(0);
      setQuoteError(null);
      setQuoteFetched(false);
      setEstimatedMinutes(null);
    }
  };

  // Consulta cotação de frete na Uber Direct
  const handleFetchQuote = async () => {
    if (!address.trim() || address.trim().length < 4) {
      setQuoteError("Informe a rua e o número da entrega.");
      return;
    }
    if (!neighborhood.trim()) {
      setQuoteError("Informe o bairro da entrega.");
      return;
    }
    setQuoteLoading(true);
    setQuoteError(null);
    setQuoteFetched(false);
    try {
      const fullAddr = getFullAddress();
      const res = await fetch("/api/delivery/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: fullAddr,
          zipCode: zipCode.trim() || undefined,
          productId: product.id,
          packageSize: product.packageSize,
        }),
      });
      const result = await res.json();
      if (result.success && result.data) {
        setDeliveryFee(result.data.customerFee);
        setEstimatedMinutes(result.data.estimatedMinutes);
        setQuotePackageSize(result.data.packageSize || product.packageSize || "SMALL");
        setQuoteFetched(true);
      } else {
        setQuoteError(
          result.error || "Não foi possível calcular o frete para este endereço."
        );
      }
    } catch {
      setQuoteError("Erro de conexão ao calcular frete. Tente novamente.");
    } finally {
      setQuoteLoading(false);
    }
  };

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Timer de expiração
  useEffect(() => {
    if (step === "qrcode" && expired) {
      setStep("expired");
      stopPolling();
    }
  }, [expired, step, stopPolling]);

  // Polling de status do pedido
  const startPolling = useCallback(
    (orderId: string) => {
      stopPolling();
      pollingRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/orders/${orderId}`);
          const result = await res.json();
          if (result.success && result.data?.status === "PAID") {
            stopPolling();
            setStep("confirmed");
          }
        } catch {
          // silencioso — tenta de novo no próximo tick
        }
      }, POLLING_INTERVAL_MS);
    },
    [stopPolling]
  );

  // Limpeza ao desmontar
  useEffect(() => () => stopPolling(), [stopPolling]);

  const handleGeneratePix = async () => {
    if (!name.trim()) {
      toast.error("Por favor, informe seu nome.");
      return;
    }
    if (!whatsapp.trim()) {
      toast.error("Por favor, informe seu WhatsApp.");
      return;
    }
    if (deliveryType === "delivery" && (!address.trim() || !neighborhood.trim())) {
      toast.error("Por favor, informe a rua, número e bairro.");
      return;
    }
    if (deliveryType === "delivery" && !quoteFetched) {
      toast.error("Calcule o frete antes de gerar o PIX.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          customerName: name.trim(),
          customerPhone: whatsapp.trim(),
          deliveryType,
          deliveryAddress: deliveryType === "delivery" ? getFullAddress() : null,
          deliveryFee: deliveryType === "delivery" ? deliveryFee : 0,
          quantity: 1,
        }),
      });

      const result = await res.json();

      if (!result.success) {
        toast.error(result.error || "Erro ao gerar o PIX. Tente novamente.");
        return;
      }

      setOrderData(result.data);
      setStep("qrcode");
      startPolling(result.data.orderId);
    } catch {
      toast.error("Erro de conexão. Verifique sua internet e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPix = () => {
    if (!orderData?.qrCode) return;
    navigator.clipboard.writeText(orderData.qrCode);
    setCopied(true);
    toast.success("Código PIX copiado!");
    setTimeout(() => setCopied(false), 3000);
  };

  const handleWhatsApp = () => {
    const deliveryText =
      deliveryType === "pickup"
        ? "🏬 Retirada no balcão da loja física"
        : `🛵 Entrega local (${address.trim()})`;

    const msg = encodeURIComponent(
      `Olá, Pink Music! 👋\n` +
        `Realizei um pagamento via *PIX* para o produto:\n\n` +
        `🎸 *Produto:* ${product.title}\n` +
        `💰 *Valor:* ${formatPrice(orderData?.totalAmount ?? product.price)}\n` +
        `👤 *Nome:* ${name}\n` +
        `📱 *WhatsApp:* ${whatsapp}\n` +
        `📦 *Modalidade:* ${deliveryText}\n` +
        `🔑 *Nº do Pedido:* ${orderData?.orderId ?? ""}\n\n` +
        `Segue o comprovante!`
    );
    window.open(`https://wa.me/5575991988685?text=${msg}`, "_blank", "noopener,noreferrer");
    onOpenChange(false);
  };

  // ─── RENDER ──────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[95vh] overflow-y-auto">
        {/* ── ETAPA 1: FORMULÁRIO ── */}
        {step === "form" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl text-emerald-700 dark:text-emerald-400">
                <Store className="h-6 w-6" />
                Comprar com PIX — Pronta Entrega
              </DialogTitle>
              <DialogDescription>
                Produto disponível no estoque físico da Pink Music.
              </DialogDescription>
            </DialogHeader>

            {/* Resumo do produto */}
            <div className="bg-muted/40 p-4 rounded-xl border border-border flex items-center justify-between">
              <div className="max-w-[70%]">
                <h4 className="font-semibold text-sm line-clamp-1">{product.title}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {product.brand?.name || "Pink Music"} · {product.available_quantity}{" "}
                  disponível(is)
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-muted-foreground block">
                  {quoteFetched ? "Subtotal" : "Preço"}
                </span>
                <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatPrice(product.price)}
                </span>
              </div>
            </div>

            {/* Modalidade */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Como deseja receber?</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleDeliveryTypeChange("pickup")}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all cursor-pointer ${
                    deliveryType === "pickup"
                      ? "border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold"
                      : "border-border hover:border-muted-foreground/40"
                  }`}
                >
                  <Store className="h-5 w-5 mb-1 text-emerald-600" />
                  <span className="text-xs">Retirar na Loja</span>
                  <span className="text-[10px] text-muted-foreground">Sem custo de frete</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDeliveryTypeChange("delivery")}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all cursor-pointer ${
                    deliveryType === "delivery"
                      ? "border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold"
                      : "border-border hover:border-muted-foreground/40"
                  }`}
                >
                  <Truck className="h-5 w-5 mb-1 text-emerald-600" />
                  <span className="text-xs">Entrega Local</span>
                  <span className="text-[10px] text-muted-foreground">Via Uber Direct</span>
                </button>
              </div>
            </div>

            {/* Dados do comprador */}
            <div className="space-y-3">
              <div>
                <Label htmlFor="checkout-name" className="text-xs">
                  Seu Nome <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="checkout-name"
                  placeholder="Ex: João da Silva"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="checkout-phone" className="text-xs">
                  WhatsApp <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="checkout-phone"
                  placeholder="(75) 99999-9999"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="mt-1"
                />
              </div>
              {deliveryType === "delivery" && (
                <div className="space-y-3 p-3 bg-muted/20 border border-border/70 rounded-xl">
                  <div>
                    <Label htmlFor="checkout-street" className="text-xs">
                      Rua e Número <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="checkout-street"
                      placeholder="Ex: Av. Getúlio Vargas, 100"
                      value={address}
                      onChange={(e) => {
                        setAddress(e.target.value);
                        invalidateQuote();
                      }}
                      className="mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="checkout-neighborhood" className="text-xs">
                        Bairro <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="checkout-neighborhood"
                        placeholder="Ex: Centro"
                        value={neighborhood}
                        onChange={(e) => {
                          setNeighborhood(e.target.value);
                          invalidateQuote();
                        }}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="checkout-zip" className="text-xs text-muted-foreground">
                        CEP (Opcional)
                      </Label>
                      <Input
                        id="checkout-zip"
                        placeholder="44000-000"
                        value={zipCode}
                        onChange={(e) => {
                          setZipCode(e.target.value);
                          invalidateQuote();
                        }}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="checkout-complement" className="text-xs text-muted-foreground">
                      Complemento / Referência (Opcional)
                    </Label>
                    <Input
                      id="checkout-complement"
                      placeholder="Ex: Apto 101, próximo ao banco"
                      value={complement}
                      onChange={(e) => {
                        setComplement(e.target.value);
                        invalidateQuote();
                      }}
                      className="mt-1"
                    />
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleFetchQuote}
                    disabled={quoteLoading || !address.trim() || !neighborhood.trim()}
                    className="w-full h-9 text-xs font-semibold flex items-center justify-center gap-1.5 border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40"
                  >
                    {quoteLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                        Calculando frete no Uber Direct...
                      </>
                    ) : (
                      <>
                        <MapPin className="h-4 w-4" />
                        {quoteFetched ? "Recalcular Frete" : "Calcular Frete com Uber Direct"}
                      </>
                    )}
                  </Button>

                  {/* Loading da cotação */}
                  {quoteLoading && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-500" />
                      Consultando Uber Direct...
                    </p>
                  )}

                  {/* Erro de cotação */}
                  {quoteError && !quoteLoading && (
                    <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-2.5">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{quoteError}</span>
                    </div>
                  )}

                  {/* Card de resultado da cotação */}
                  {quoteFetched && !quoteLoading && (
                    <div className="rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-700 dark:text-purple-300">
                          {quotePackageSize === "SMALL" ? (
                            <>
                              <span className="text-sm">🛵</span>
                              <span>Entrega Rápida via Moto (Uber Direct)</span>
                            </>
                          ) : quotePackageSize === "LARGE" || quotePackageSize === "XLARGE" ? (
                            <>
                              <span className="text-sm">🚗</span>
                              <span>Entrega Segura via Carro (Uber Direct)</span>
                            </>
                          ) : (
                            <>
                              <Truck className="h-4 w-4" />
                              <span>Entrega Expressa via Uber Direct</span>
                            </>
                          )}
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 font-medium">
                          {quotePackageSize === "SMALL"
                            ? "Pacote Pequeno"
                            : quotePackageSize === "LARGE" || quotePackageSize === "XLARGE"
                            ? "Porta-malas"
                            : "Pacote Médio"}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {quotePackageSize === "SMALL"
                          ? "Item pequeno: motoboy alocado com agilidade para entrega no mesmo dia."
                          : quotePackageSize === "LARGE" || quotePackageSize === "XLARGE"
                          ? "Instrumento volumoso: motorista de carro alocado para transporte seguro."
                          : "Despacho sob demanda com entregador parceiro Uber."}
                      </p>
                      <div className="flex justify-between text-xs text-muted-foreground pt-1">
                        <span>Previsão de entrega:</span>
                        <span className="font-medium text-foreground">
                          ~{estimatedMinutes} minutos
                        </span>
                      </div>
                      <div className="border-t border-purple-200/60 dark:border-purple-800/60 pt-1.5 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Subtotal (produto):</span>
                          <span>{formatPrice(product.price)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Frete Uber Direct:</span>
                          <span className="text-purple-700 dark:text-purple-300 font-medium">
                            + {formatPrice(deliveryFee)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm font-bold border-t border-purple-200/60 dark:border-purple-800/60 pt-1 mt-1">
                          <span>Total no PIX:</span>
                          <span className="text-emerald-600 dark:text-emerald-400">
                            {formatPrice(product.price + deliveryFee)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Button
              type="button"
              onClick={handleGeneratePix}
              disabled={loading || (deliveryType === "delivery" && !quoteFetched)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-full flex items-center justify-center gap-2 font-semibold shadow-md disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Gerando PIX...
                </>
              ) : (
                <>
                  <QrCode className="h-5 w-5" />
                  {deliveryType === "delivery" && !quoteFetched
                    ? "Calcule o frete para continuar"
                    : "Gerar QR Code PIX"}
                </>
              )}
            </Button>
          </>
        )}

        {/* ── ETAPA 2: QR CODE ── */}
        {step === "qrcode" && orderData && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl text-emerald-700 dark:text-emerald-400">
                <QrCode className="h-6 w-6" />
                Pague com PIX
              </DialogTitle>
              <DialogDescription>
                Escaneie o QR Code ou copie o código abaixo no seu banco.
              </DialogDescription>
            </DialogHeader>

            {/* Countdown */}
            <div className="flex items-center justify-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-400">
              <Clock className="h-4 w-4" />
              Expira em {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center gap-4">
              <div className="bg-white p-3 rounded-xl border border-border shadow-sm">
                <Image
                  src={`data:image/png;base64,${orderData.qrCodeBase64}`}
                  alt="QR Code PIX"
                  width={220}
                  height={220}
                  className="rounded"
                />
              </div>

              {/* Código copia-e-cola */}
              <div className="w-full bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 p-3 rounded-xl space-y-2">
                <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 text-center">
                  Código PIX (copia e cola)
                </p>
                <p className="font-mono text-[10px] break-all bg-background/80 p-2 rounded border text-center select-all leading-relaxed">
                  {orderData.qrCode}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCopyPix}
                  className="w-full h-8 text-xs flex items-center justify-center gap-1.5"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" /> Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> Copiar Código PIX
                    </>
                  )}
                </Button>
              </div>

              {/* Status aguardando */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                Aguardando confirmação do pagamento...
              </div>

              <p className="text-[11px] text-center text-muted-foreground">
                Nº do Pedido: <span className="font-mono font-semibold">{orderData.orderId}</span>
              </p>
            </div>
          </>
        )}

        {/* ── ETAPA 3: CONFIRMADO ── */}
        {step === "confirmed" && orderData && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl text-emerald-700 dark:text-emerald-400">
                <CheckCircle className="h-6 w-6" />
                Pagamento Confirmado! 🎉
              </DialogTitle>
              <DialogDescription>
                Seu pedido foi registrado e está sendo preparado.
              </DialogDescription>
            </DialogHeader>

            <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-4 rounded-xl space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Produto</span>
                <span className="font-semibold text-right max-w-[55%] line-clamp-1">
                  {product.title}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Pago</span>
                <span className="font-bold text-emerald-600">
                  {formatPrice(orderData.totalAmount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Modalidade</span>
                <span className="font-semibold capitalize">
                  {deliveryType === "pickup" ? "Retirada na loja" : "Entrega local"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nº do Pedido</span>
                <span className="font-mono text-xs font-semibold">{orderData.orderId}</span>
              </div>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Envie o comprovante do PIX via WhatsApp para agilizar a separação do seu produto.
            </p>

            <div className="space-y-2">
              <Button
                type="button"
                onClick={handleWhatsApp}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-full flex items-center justify-center gap-2 font-semibold shadow-md"
              >
                <MessageCircle className="h-5 w-5" />
                Enviar Comprovante via WhatsApp
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="w-full rounded-full"
              >
                Fechar
              </Button>
            </div>
          </>
        )}

        {/* ── EXPIRADO ── */}
        {step === "expired" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl text-red-600 dark:text-red-400">
                <XCircle className="h-6 w-6" />
                PIX Expirado
              </DialogTitle>
              <DialogDescription>
                O tempo para pagamento esgotou. Gere um novo QR Code para continuar.
              </DialogDescription>
            </DialogHeader>
            <Button
              type="button"
              onClick={() => setStep("form")}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-full font-semibold"
            >
              <QrCode className="h-5 w-5 mr-2" />
              Gerar Novo PIX
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
