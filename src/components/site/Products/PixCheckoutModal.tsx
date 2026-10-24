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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import type { Product } from "@/lib/types";
import { usePixDiscount } from "@/hooks/usePixDiscount";

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
  discountAmount?: number;
  pixDiscountPercent?: number;
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

  // Cotação de frete local fixo por zona
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [shippingZoneName, setShippingZoneName] = useState<string | null>(null);
  const [shippingZoneDescription, setShippingZoneDescription] = useState<string | null>(null);
  const [shippingDistanceKm, setShippingDistanceKm] = useState<number | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteFetched, setQuoteFetched] = useState(false);
  const [quotedZip, setQuotedZip] = useState<string | null>(null);

  // Fluxo de seleção de bairro (NEEDS_NEIGHBORHOOD)
  const [needsNeighborhood, setNeedsNeighborhood] = useState(false);
  const [neighborhoodsList, setNeighborhoodsList] = useState<Array<{ key: string; name: string }>>([]);
  const [selectedNeighborhoodKey, setSelectedNeighborhoodKey] = useState<string>("");
  const [needsReviewWarning, setNeedsReviewWarning] = useState(false);
  const [isOutOfArea, setIsOutOfArea] = useState(false);

  // AbortController para cancelar requisições anteriores
  const quoteAbortControllerRef = useRef<AbortController | null>(null);

  // Flow state
  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [copied, setCopied] = useState(false);

  const { pixDiscountPercent } = usePixDiscount();
  const discountAmount = parseFloat((product.price * (pixDiscountPercent / 100)).toFixed(2));
  const totalWithDiscountAndDelivery = (product.price - discountAmount) + (deliveryType === "delivery" ? deliveryFee : 0);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { minutes, seconds, expired } = useCountdown(
    step === "qrcode" ? orderData?.expiresAt ?? null : null
  );

  // Helper para endereço completo e legível
  const getFullAddress = useCallback(() => {
    const parts = [address.trim()];
    if (neighborhood.trim()) parts.push(`Bairro ${neighborhood.trim()}`);
    if (complement.trim()) parts.push(complement.trim());
    if (zipCode.trim()) parts.push(`CEP: ${zipCode.trim()}`);
    return parts.filter(Boolean).join(", ");
  }, [address, neighborhood, complement, zipCode]);

  // Invalida cotação se endereço for alterado
  const invalidateQuote = useCallback(() => {
    if (quoteAbortControllerRef.current) {
      quoteAbortControllerRef.current.abort();
      quoteAbortControllerRef.current = null;
    }
    if (quoteFetched || needsNeighborhood || isOutOfArea || quoteError) {
      setQuoteFetched(false);
      setQuotedZip(null);
      setDeliveryFee(0);
      setShippingZoneName(null);
      setShippingZoneDescription(null);
      setShippingDistanceKm(null);
      setQuoteError(null);
      setNeedsNeighborhood(false);
      setNeighborhoodsList([]);
      setSelectedNeighborhoodKey("");
      setNeedsReviewWarning(false);
      setIsOutOfArea(false);
    }
  }, [quoteFetched, needsNeighborhood, isOutOfArea, quoteError]);

  // Reset ao fechar
  useEffect(() => {
    if (!open) {
      if (quoteAbortControllerRef.current) {
        quoteAbortControllerRef.current.abort();
        quoteAbortControllerRef.current = null;
      }
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
        setShippingZoneName(null);
        setShippingZoneDescription(null);
        setShippingDistanceKm(null);
        setQuoteLoading(false);
        setQuoteError(null);
        setQuoteFetched(false);
        setQuotedZip(null);
        setNeedsNeighborhood(false);
        setNeighborhoodsList([]);
        setSelectedNeighborhoodKey("");
        setNeedsReviewWarning(false);
        setIsOutOfArea(false);
      }, 300);
    }
  }, [open]);

  // Quando troca para retirada, limpa cotação
  const handleDeliveryTypeChange = (type: "pickup" | "delivery") => {
    setDeliveryType(type);
    if (type === "pickup") {
      invalidateQuote();
    }
  };

  // Consulta frete local por regras fixas no banco
  const handleFetchQuote = async (overrideNeighborhoodKey?: string) => {
    const cleanCep = zipCode.replace(/\D/g, "");
    if (!cleanCep || cleanCep.length !== 8) {
      setQuoteError("Informe um CEP válido com 8 dígitos.");
      return;
    }

    if (quoteAbortControllerRef.current) {
      quoteAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    quoteAbortControllerRef.current = controller;

    setQuoteLoading(true);
    setQuoteError(null);

    const activeKey =
      overrideNeighborhoodKey !== undefined ? overrideNeighborhoodKey : selectedNeighborhoodKey;

    try {
      const res = await fetch("/api/shipping/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zipCode: cleanCep,
          selectedNeighborhoodKey: activeKey ? activeKey : undefined,
        }),
        signal: controller.signal,
      });

      const result = await res.json();

      if (result.available && result.price !== undefined) {
        setDeliveryFee(result.price);
        setShippingZoneName(result.zone?.name || "Zona Local");
        setShippingZoneDescription(result.zone?.description || null);
        setShippingDistanceKm(result.distanceKm);
        setNeedsReviewWarning(Boolean(result.needsReview));
        setQuoteFetched(true);
        setQuotedZip(cleanCep);
        setNeedsNeighborhood(false);
        setIsOutOfArea(false);

        if (result.district) {
          setNeighborhood(result.district);
        }
      } else {
        setQuoteFetched(false);
        setQuotedZip(null);

        if (result.reason === "NEEDS_NEIGHBORHOOD") {
          setNeedsNeighborhood(true);
          setNeighborhoodsList(result.neighborhoods || []);
          setIsOutOfArea(false);
          setQuoteError(null);
        } else if (result.reason === "OUT_OF_DELIVERY_AREA") {
          setIsOutOfArea(true);
          setNeedsNeighborhood(false);
          setQuoteError(
            result.message || "Desculpe, este endereço fica fora da nossa área de entrega rápida."
          );
        } else {
          setIsOutOfArea(false);
          setNeedsNeighborhood(false);
          setQuoteError(result.message || "Não foi possível calcular o frete para este CEP.");
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
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
    if (deliveryType === "delivery") {
      const cleanCurrentZip = zipCode.replace(/\D/g, "");
      if (cleanCurrentZip.length !== 8) {
        toast.error("Por favor, informe um CEP válido com 8 dígitos.");
        return;
      }
      if (!quoteFetched || quotedZip !== cleanCurrentZip) {
        toast.error("Por favor, calcule o frete para o CEP atual antes de gerar o PIX.");
        return;
      }
      if (!address.trim() || !neighborhood.trim()) {
        toast.error("Por favor, informe a rua, número e bairro.");
        return;
      }
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
          zipCode: deliveryType === "delivery" ? zipCode.replace(/\D/g, "") : null,
          shippingCep: deliveryType === "delivery" ? zipCode.replace(/\D/g, "") : null,
          selectedNeighborhoodKey:
            deliveryType === "delivery" && selectedNeighborhoodKey
              ? selectedNeighborhoodKey
              : undefined,
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
    window.open(`https://wa.me/5575999661614?text=${msg}`, "_blank", "noopener,noreferrer");
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
              <div className="max-w-[65%]">
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
                <span className="text-xl font-bold text-foreground">
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
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all cursor-pointer ${deliveryType === "pickup"
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
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all cursor-pointer ${deliveryType === "delivery"
                    ? "border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold"
                    : "border-border hover:border-muted-foreground/40"
                    }`}
                >
                  <Truck className="h-5 w-5 mb-1 text-emerald-600" />
                  <span className="text-xs">Entrega Local</span>
                  <span className="text-[10px] text-muted-foreground">Motoboy / Loja</span>
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
                  {/* CEP com cálculo de frete local */}
                  <div>
                    <Label htmlFor="checkout-zip" className="text-xs font-medium">
                      CEP de Entrega <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        id="checkout-zip"
                        placeholder="44000-000"
                        maxLength={9}
                        value={zipCode}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
                          const formatted = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
                          setZipCode(formatted);
                          invalidateQuote();
                        }}
                        className="font-mono tracking-wider text-sm"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleFetchQuote()}
                        disabled={quoteLoading || zipCode.replace(/\D/g, "").length !== 8}
                        className="shrink-0 border-emerald-600/50 text-emerald-700 hover:bg-emerald-50/50 font-semibold"
                      >
                        {quoteLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                        ) : (
                          <Truck className="h-4 w-4 mr-1.5 text-emerald-600" />
                        )}
                        {quoteLoading ? "Calculando..." : quoteFetched ? "Recalcular" : "Calcular Frete"}
                      </Button>
                    </div>
                  </div>

                  {/* Estado NEEDS_NEIGHBORHOOD: Seleção amigável de bairro */}
                  {needsNeighborhood && !quoteLoading && (
                    <div className="rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 p-3 space-y-2.5 text-xs text-sky-900 dark:text-sky-200">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400 mt-0.5" />
                        <div>
                          <p className="font-semibold">Bairro não identificado pelo CEP</p>
                          <p className="text-[11px] text-sky-800/80 dark:text-sky-300/80 mt-0.5">
                            Não encontramos seu bairro automaticamente. Escolha-o na lista abaixo para calcular seu frete:
                          </p>
                        </div>
                      </div>

                      <Select
                        value={selectedNeighborhoodKey}
                        onValueChange={(val) => {
                          setSelectedNeighborhoodKey(val);
                          if (val === "not_in_list") {
                            setQuoteFetched(false);
                            setQuotedZip(null);
                            setDeliveryFee(0);
                          } else {
                            handleFetchQuote(val);
                          }
                        }}
                      >
                        <SelectTrigger className="w-full bg-white dark:bg-slate-900 text-xs">
                          <SelectValue placeholder="Selecione seu bairro..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>Bairros de Feira de Santana</SelectLabel>
                            {neighborhoodsList.map((nb) => (
                              <SelectItem key={nb.key} value={nb.key}>
                                {nb.name}
                              </SelectItem>
                            ))}
                            <SelectSeparator />
                            <SelectItem value="not_in_list" className="text-amber-700 dark:text-amber-400 font-medium">
                              Meu bairro não está na lista
                            </SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>

                      {selectedNeighborhoodKey === "not_in_list" && (
                        <div className="p-2.5 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs space-y-2">
                          <p>
                            Seu bairro não apareceu na lista? Não se preocupe! Fale diretamente conosco pelo WhatsApp para combinarmos o envio para seu endereço.
                          </p>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="w-full border-amber-300 text-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/40 font-semibold gap-1.5"
                            onClick={() => {
                              const msg = encodeURIComponent(
                                `Olá! Estou tentando comprar o produto "${product.title}" com entrega para o CEP ${zipCode}, mas meu bairro não apareceu na lista. Poderiam cotar o frete para mim?`
                              );
                              window.open(`https://wa.me/5575999661614?text=${msg}`, "_blank", "noopener,noreferrer");
                            }}
                          >
                            <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                            Falar no WhatsApp com o CEP
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Estado OUT_OF_DELIVERY_AREA: Fora da área de motoboy com link WhatsApp */}
                  {isOutOfArea && !quoteLoading && (
                    <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3 space-y-2 text-xs text-amber-900 dark:text-amber-200">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                        <div>
                          <p className="font-semibold">Endereço fora da área padrão de motoboy</p>
                          <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                            {quoteError || "Este CEP fica além do raio da nossa entrega rápida. Fale conosco no WhatsApp para combinarmos uma entrega especial!"}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="w-full border-amber-300 text-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/40 font-semibold gap-1.5"
                        onClick={() => {
                          const msg = encodeURIComponent(
                            `Olá! Tentei calcular a entrega para o CEP ${zipCode} no site da Pink Music para o produto "${product.title}", mas avisou que fica fora do raio de motoboy. Conseguem fazer entrega especial para cá?`
                          );
                          window.open(`https://wa.me/5575999661614?text=${msg}`, "_blank", "noopener,noreferrer");
                        }}
                      >
                        <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                        Combinar Entrega Especial no WhatsApp
                      </Button>
                    </div>
                  )}

                  {/* Erro comum de cotação */}
                  {quoteError && !needsNeighborhood && !isOutOfArea && !quoteLoading && (
                    <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-2.5">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{quoteError}</span>
                    </div>
                  )}

                  {/* Card de resultado da cotação */}
                  {quoteFetched && !quoteLoading && (
                    <div className="rounded-lg bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 p-3.5 space-y-2 shadow-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 dark:text-emerald-200">
                          <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          <span>Entrega local disponível</span>
                        </div>
                        <span className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400">
                          + {formatPrice(deliveryFee)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-emerald-800/80 dark:text-emerald-300/80">
                        {shippingZoneName && (
                          <span className="bg-emerald-200/60 dark:bg-emerald-900/60 px-2 py-0.5 rounded-md font-semibold">
                            {shippingZoneName}
                          </span>
                        )}
                        {shippingZoneDescription ? (
                          <span>• Faixa de entrega: {shippingZoneDescription}</span>
                        ) : shippingDistanceKm !== null ? (
                          <span>• Distância aprox: ~{shippingDistanceKm.toFixed(1)} km</span>
                        ) : null}
                      </div>
                      {needsReviewWarning && (
                        <div className="flex items-center gap-1.5 pt-1.5 border-t border-emerald-200/60 dark:border-emerald-800/60 text-[11px] text-amber-800 dark:text-amber-300 font-medium">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                          <span>Vamos confirmar seu endereço pelo WhatsApp antes da entrega.</span>
                        </div>
                      )}
                    </div>
                  )}

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
                        }}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="checkout-complement" className="text-xs text-muted-foreground">
                        Complemento
                      </Label>
                      <Input
                        id="checkout-complement"
                        placeholder="Ex: Apto 101"
                        value={complement}
                        onChange={(e) => {
                          setComplement(e.target.value);
                        }}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Resumo de valores */}
            <div className="bg-muted/30 rounded-xl p-3.5 space-y-2 border border-border/50">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Preço do produto</span>
                <span className="font-medium">{formatPrice(product.price)}</span>
              </div>
              {pixDiscountPercent > 0 && discountAmount > 0 && (
                <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400">
                  <span className="flex items-center gap-1 font-medium">
                    <Sparkles className="h-3 w-3" />
                    Desconto PIX ({pixDiscountPercent}%)
                  </span>
                  <span className="font-semibold">- {formatPrice(discountAmount)}</span>
                </div>
              )}
              {deliveryType === "delivery" && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Frete</span>
                  <span className="font-medium">
                    {quoteFetched ? formatPrice(deliveryFee) : "a calcular"}
                  </span>
                </div>
              )}
              <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                <span className="font-semibold text-sm">Total</span>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {formatPrice(totalWithDiscountAndDelivery)}
                </span>
              </div>
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
                    : `Gerar QR Code PIX — ${formatPrice(totalWithDiscountAndDelivery)}`}
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

            {/* Total e Desconto */}
            <div className="text-center text-sm font-semibold text-foreground space-y-1">
              <div>
                Total:{" "}
                <span className="text-emerald-600 dark:text-emerald-400 text-lg">
                  {formatPrice(orderData.totalAmount)}
                </span>
              </div>
              {orderData.discountAmount && orderData.discountAmount > 0 ? (
                <div className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Desconto PIX de {orderData.pixDiscountPercent}% aplicado (- {formatPrice(orderData.discountAmount)})
                </div>
              ) : null}
            </div>

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
                  unoptimized
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
