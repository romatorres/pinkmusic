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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
  ShoppingBag,
  Package,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { getOptimizedImageUrl } from "@/lib/productImages";

interface CartCheckoutModalProps {
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

const POLLING_INTERVAL_MS = 5000;
const PIX_DURATION_MS = 30 * 60 * 1000;

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

export function CartCheckoutModal({ open, onOpenChange }: CartCheckoutModalProps) {
  const { items, subtotal, clearCart } = useCartStore();
  const { user } = useAuthStore();

  // Pré-preenche com dados do usuário autenticado
  const [name, setName] = useState(user?.name || "");
  const [whatsapp, setWhatsapp] = useState(user?.phone || "");
  const [deliveryType, setDeliveryType] = useState<"pickup" | "delivery">("pickup");
  const [zipCode, setZipCode] = useState("");
  const [address, setAddress] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [complement, setComplement] = useState("");

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

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { minutes, seconds, expired } = useCountdown(
    step === "qrcode" ? orderData?.expiresAt ?? null : null
  );

  const total = subtotal();

  // Preenche dados do usuário ao abrir
  useEffect(() => {
    if (open && user) {
      setName(user.name || "");
      setWhatsapp(user.phone || "");
    }
  }, [open, user]);

  const getFullAddress = useCallback(() => {
    const parts = [address.trim()];
    if (neighborhood.trim()) parts.push(`Bairro ${neighborhood.trim()}`);
    if (complement.trim()) parts.push(complement.trim());
    if (zipCode.trim()) parts.push(`CEP: ${zipCode.trim()}`);
    return parts.filter(Boolean).join(", ");
  }, [address, neighborhood, complement, zipCode]);

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
        setDeliveryType("pickup");
        setZipCode("");
        setAddress("");
        setNeighborhood("");
        setComplement("");
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

  const handleDeliveryTypeChange = (type: "pickup" | "delivery") => {
    setDeliveryType(type);
    if (type === "pickup") {
      invalidateQuote();
    }
  };

  // Cálculo de Frete Local por CEP e Regras do Banco
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

        // Preenche bairro automaticamente se estiver vazio e vier na resposta
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

  // Timer de expiração do PIX
  useEffect(() => {
    if (step === "qrcode" && expired) {
      setStep("expired");
      stopPolling();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expired, step]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

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
          // silencioso
        }
      }, POLLING_INTERVAL_MS);
    },
    [stopPolling]
  );

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
          items: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
          })),
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
    const itemsSummary = items
      .map((i) => `• ${i.title} (x${i.quantity}) — ${formatPrice(i.price * i.quantity)}`)
      .join("\n");

    const deliveryText =
      deliveryType === "pickup"
        ? "🏬 Retirada no balcão da loja física"
        : `🛵 Entrega local (${address.trim()})`;

    const msg = encodeURIComponent(
      `Olá, Pink Music! 👋\n` +
      `Realizei um pagamento via *PIX* para os produtos:\n\n` +
      `${itemsSummary}\n\n` +
      `💰 *Total:* ${formatPrice(orderData?.totalAmount ?? total)}\n` +
      `👤 *Nome:* ${name}\n` +
      `📱 *WhatsApp:* ${whatsapp}\n` +
      `📦 *Modalidade:* ${deliveryText}\n` +
      `🔑 *Nº do Pedido:* ${orderData?.orderId ?? ""}\n\n` +
      `Segue o comprovante!`
    );
    window.open(`https://wa.me/5575999661614?text=${msg}`, "_blank", "noopener,noreferrer");

    // Limpa o carrinho após confirmar via WhatsApp
    clearCart();
    onOpenChange(false);
  };

  const totalWithDelivery = total + (deliveryType === "delivery" ? deliveryFee : 0);

  // Formulário completo para habilitar Gerar PIX
  const isDeliveryReady =
    deliveryType !== "delivery" ||
    (
      quoteFetched &&
      zipCode.replace(/\D/g, "").length === 8 &&
      address.trim() !== "" &&
      neighborhood.trim() !== ""
    );
  const isFormReady = name.trim() !== "" && whatsapp.trim() !== "" && isDeliveryReady;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[95vh] overflow-y-auto">
        {/* ── ETAPA 1: FORMULÁRIO ── */}
        {step === "form" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl text-emerald-700 dark:text-emerald-400">
                <ShoppingBag className="h-6 w-6" />
                Finalizar Pedido
              </DialogTitle>
              <DialogDescription>
                Revise os itens e escolha como quer receber.
              </DialogDescription>
            </DialogHeader>

            {/* Resumo dos itens do carrinho */}
            <div className="bg-muted/40 rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border/50 flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Itens do carrinho
                </span>
                <span className="text-xs text-muted-foreground">
                  {items.reduce((s, i) => s + i.quantity, 0)} produto(s)
                </span>
              </div>
              <ScrollArea className="max-h-[180px]">
                <div className="p-3 space-y-2">
                  {items.map((item) => (
                    <div key={item.productId} className="flex items-center gap-2">
                      <div className="relative h-8 w-8 flex-shrink-0 rounded overflow-hidden bg-muted/60">
                        {item.thumbnail ? (
                          <Image
                            src={getOptimizedImageUrl(item.thumbnail)}
                            alt={item.title}
                            fill
                            className="object-cover"
                            sizes="32px"
                          />
                        ) : (
                          <Package className="h-4 w-4 m-auto text-muted-foreground/50" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{item.title}</p>
                        {item.code && (
                          <p className="text-[10px] text-muted-foreground">
                            Cód: {item.code}
                          </p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-bold text-foreground">
                          {formatPrice(item.price * item.quantity)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {item.quantity}x {formatPrice(item.price)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="px-4 py-2.5 border-t border-border/50 bg-muted/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Subtotal</span>
                  <span className="text-sm font-bold text-emerald-600">
                    {formatPrice(total)}
                  </span>
                </div>
              </div>
            </div>

            {/* Modalidade de entrega */}
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
                <Label htmlFor="cart-name" className="text-xs">
                  Seu Nome <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="cart-name"
                  type="text"
                  placeholder="Nome completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="cart-phone" className="text-xs">
                  WhatsApp <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="cart-phone"
                  type="tel"
                  placeholder="(99) 99999-9999"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Endereço de entrega */}
            {deliveryType === "delivery" && (
              <div className="space-y-3 pt-1">
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-emerald-600" />
                  Entrega Local em Feira de Santana
                </Label>

                {/* Input de CEP com cálculo imediato */}
                <div>
                  <Label htmlFor="cart-zip" className="text-xs font-medium">
                    CEP de Entrega <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="cart-zip"
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
                      disabled={
                        quoteLoading ||
                        zipCode.replace(/\D/g, "").length !== 8
                      }
                      className="shrink-0 border-emerald-600/50 text-emerald-700 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 font-semibold"
                    >
                      {quoteLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Truck className="h-4 w-4 text-emerald-600" />
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
                              `Olá! Estou fechando um pedido no carrinho do site da Pink Music para o CEP ${zipCode}, mas meu bairro não apareceu na lista. Poderiam cotar o frete para mim?`
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
                          `Olá! Tentei calcular a entrega no carrinho para o CEP ${zipCode} no site da Pink Music, mas avisou que fica fora do raio de motoboy. Conseguem fazer entrega especial para cá?`
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
                  <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 dark:bg-red-950/30 p-3 rounded-lg border border-red-200 dark:border-red-800">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>{quoteError}</span>
                  </div>
                )}

                {quoteFetched && !quoteLoading && (
                  <div className="bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl p-3.5 space-y-2 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                          Entrega local disponível
                        </span>
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

                {/* Dica antes de calcular */}
                {!quoteFetched && !needsNeighborhood && !isOutOfArea && !quoteError && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 border border-border/60 rounded-lg px-3 py-2.5">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    <span>Informe seu CEP e calcule o frete para liberar os campos de endereço.</span>
                  </div>
                )}

                {/* Endereço liberado somente após cálculo do frete */}
                {quoteFetched && (
                  <div className="space-y-3 pt-1 border-t border-border/50">
                    <div>
                      <Label htmlFor="cart-address" className="text-xs">
                        Rua e Número <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="cart-address"
                        placeholder="Ex: Rua das Flores, 123"
                        value={address}
                        onChange={(e) => { setAddress(e.target.value); }}
                        className="mt-1"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="cart-neighborhood" className="text-xs">
                          Bairro <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="cart-neighborhood"
                          placeholder="Ex: Centro"
                          value={neighborhood}
                          onChange={(e) => { setNeighborhood(e.target.value); }}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="cart-complement" className="text-xs">
                          Complemento
                        </Label>
                        <Input
                          id="cart-complement"
                          placeholder="Apto, bloco..."
                          value={complement}
                          onChange={(e) => setComplement(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Total */}
            <div className="bg-muted/30 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatPrice(total)}</span>
              </div>
              {deliveryType === "delivery" && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Frete</span>
                  <span className="font-medium">
                    {quoteFetched ? formatPrice(deliveryFee) : "a calcular"}
                  </span>
                </div>
              )}
              <Separator className="opacity-50" />
              <div className="flex items-center justify-between">
                <span className="font-semibold text-base">Total</span>
                <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatPrice(totalWithDelivery)}
                </span>
              </div>
            </div>

            <Button
              onClick={handleGeneratePix}
              disabled={loading || !isFormReady}
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-sm"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <QrCode className="h-4 w-4" />
              )}
              {loading
                ? "Gerando PIX..."
                : !isFormReady && deliveryType === "delivery" && !quoteFetched
                  ? "Calcule o frete para continuar"
                  : `Gerar QR Code PIX — ${formatPrice(totalWithDelivery)}`}
            </Button>
          </>
        )}

        {/* ── ETAPA 2: QR CODE ── */}
        {step === "qrcode" && orderData && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl text-emerald-700">
                <QrCode className="h-6 w-6" />
                Pague com PIX
              </DialogTitle>
              <DialogDescription>
                Escaneie o QR Code ou copie o código abaixo.
              </DialogDescription>
            </DialogHeader>

            <div className="text-center text-sm font-semibold text-foreground">
              Total:{" "}
              <span className="text-emerald-600 text-lg">
                {formatPrice(orderData.totalAmount)}
              </span>
            </div>

            <div className="flex justify-center">
              {orderData.qrCodeBase64 ? (
                <Image
                  src={`data:image/png;base64,${orderData.qrCodeBase64}`}
                  alt="QR Code PIX"
                  width={220}
                  height={220}
                  className="rounded-xl border border-border shadow-md"
                  priority
                  unoptimized
                />
              ) : (
                <div className="h-[220px] w-[220px] rounded-xl border-2 border-dashed border-border flex items-center justify-center">
                  <QrCode className="h-20 w-20 text-muted-foreground/40" />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-800 justify-center">
              <Clock className="h-4 w-4" />
              Expira em {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </div>

            <Button variant="outline" onClick={handleCopyPix} className="w-full h-10">
              {copied ? (
                <Check className="h-4 w-4 mr-2 text-emerald-600" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              {copied ? "Copiado!" : "Copiar Código PIX"}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Após o pagamento, a confirmação é automática. Enquanto isso, aguarde ou avise via WhatsApp.
            </p>

            <Button
              variant="outline"
              onClick={handleWhatsApp}
              className="w-full h-10 border-emerald-600/50 text-emerald-700 hover:bg-emerald-50"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Avisar via WhatsApp
            </Button>
          </>
        )}

        {/* ── ETAPA 3: CONFIRMADO ── */}
        {step === "confirmed" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl text-emerald-700">
                <Sparkles className="h-6 w-6" />
                Pagamento Confirmado!
              </DialogTitle>
            </DialogHeader>

            <div className="text-center space-y-4 py-4">
              <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto" />
              <div>
                <p className="font-semibold text-lg">Pedido recebido com sucesso! 🎸</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Nossa equipe já foi notificada e está preparando seu pedido.
                </p>
              </div>
              <p className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-lg">
                Nº do pedido: <span className="font-mono font-semibold">{orderData?.orderId}</span>
              </p>
            </div>

            <Button
              onClick={handleWhatsApp}
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Enviar Comprovante via WhatsApp
            </Button>
          </>
        )}

        {/* ── ETAPA 4: EXPIRADO ── */}
        {step === "expired" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl text-red-600">
                <XCircle className="h-6 w-6" />
                PIX Expirado
              </DialogTitle>
            </DialogHeader>

            <div className="text-center space-y-4 py-4">
              <XCircle className="h-16 w-16 text-red-400 mx-auto" />
              <p className="text-muted-foreground text-sm">
                O tempo de pagamento expirou. Gere um novo código PIX para concluir a compra.
              </p>
            </div>

            <Button
              onClick={() => { setStep("form"); setOrderData(null); }}
              variant="outline"
              className="w-full"
            >
              Tentar Novamente
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
