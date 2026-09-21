"use client";

import React, { useState } from "react";
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
import { Store, CheckCircle, Copy, Check, MessageCircle, Truck } from "lucide-react";
import { toast } from "sonner";
import type { Product } from "@/lib/types";

interface PixCheckoutModalProps {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PixCheckoutModal({
  product,
  open,
  onOpenChange,
}: PixCheckoutModalProps) {
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [deliveryType, setDeliveryType] = useState<"pickup" | "delivery">("pickup");
  const [address, setAddress] = useState("");
  const [copied, setCopied] = useState(false);

  // Formatação de preço
  const formattedPrice = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(product.price);

  // Chave PIX padrão (celular ou chave da loja)
  const pixKey = "75991988685";

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixKey);
    setCopied(true);
    toast.success("Chave PIX copiada para a área de transferência!");
    setTimeout(() => setCopied(false), 3000);
  };

  const handleFinishWhatsApp = () => {
    if (!name.trim()) {
      toast.error("Por favor, informe seu nome.");
      return;
    }

    const deliveryText =
      deliveryType === "pickup"
        ? "🏬 *Retirada no balcão da loja física*"
        : `🛵 *Entrega local via motoboy* (Endereço: ${address.trim() || "A combinar"})`;

    const message = encodeURIComponent(
      `Olá, Pink Music! 👋\n` +
      `Gostaria de comprar via *PIX* o produto do estoque local:\n\n` +
      `🎸 *Produto:* ${product.title}\n` +
      `💰 *Valor:* ${formattedPrice}\n` +
      `👤 *Cliente:* ${name.trim()}\n` +
      `📱 *WhatsApp:* ${whatsapp.trim() || "Não informado"}\n` +
      `📦 *Modalidade:* ${deliveryText}\n\n` +
      `Já estou com a chave PIX salva para envio do comprovante!`
    );

    const whatsappUrl = `https://wa.me/5575991988685?text=${message}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-emerald-700 dark:text-emerald-400">
            <Store className="h-6 w-6" />
            Comprar com PIX - Pronta Entrega
          </DialogTitle>
          <DialogDescription>
            Produto disponível no estoque físico da Pink Music. Pague via PIX e retire no balcão ou combine entrega.
          </DialogDescription>
        </DialogHeader>

        {/* Resumo do Produto */}
        <div className="bg-muted/40 p-4 rounded-xl border border-border flex items-center justify-between">
          <div className="max-w-[70%]">
            <h4 className="font-semibold text-sm line-clamp-1">{product.title}</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              {product.brand?.name || "Pink Music"} • {product.available_quantity} disponível(is)
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-muted-foreground block">Total:</span>
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {formattedPrice}
            </span>
          </div>
        </div>

        {/* Modalidade de Recebimento */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Como deseja receber?</Label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setDeliveryType("pickup")}
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
              onClick={() => setDeliveryType("delivery")}
              className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all cursor-pointer ${
                deliveryType === "delivery"
                  ? "border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold"
                  : "border-border hover:border-muted-foreground/40"
              }`}
            >
              <Truck className="h-5 w-5 mb-1 text-emerald-600" />
              <span className="text-xs">Entrega Local</span>
              <span className="text-[10px] text-muted-foreground">Motoboy a combinar</span>
            </button>
          </div>
        </div>

        {/* Formulário do Comprador */}
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
              WhatsApp para Contato
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
            <div>
              <Label htmlFor="checkout-address" className="text-xs">
                Endereço de Entrega
              </Label>
              <Input
                id="checkout-address"
                placeholder="Rua, número, bairro..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="mt-1"
              />
            </div>
          )}
        </div>

        {/* Chave PIX */}
        <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 p-4 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              Chave PIX da Pink Music (Telefone)
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyPix}
              className="h-7 text-xs flex items-center gap-1"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-emerald-600" /> Copiado!
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" /> Copiar Chave
                </>
              )}
            </Button>
          </div>
          <div className="font-mono text-sm bg-background/80 p-2 rounded border text-center font-bold text-foreground select-all">
            {pixKey}
          </div>
          <p className="text-[11px] text-muted-foreground text-center">
            Favorecido: <strong>Pink Music Instrumentos</strong>
          </p>
        </div>

        {/* Botão Finalizar */}
        <div className="pt-2">
          <Button
            type="button"
            onClick={handleFinishWhatsApp}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-full flex items-center justify-center gap-2 font-semibold shadow-md"
          >
            <MessageCircle className="h-5 w-5" />
            Confirmar e Enviar Pedido via WhatsApp
          </Button>
          <p className="text-[10px] text-center text-muted-foreground mt-2">
            Ao confirmar, você será direcionado ao WhatsApp da loja para envio do comprovante e retirada.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
