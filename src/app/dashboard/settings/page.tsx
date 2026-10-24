"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  Percent,
  Save,
  Loader2,
  Info,
  QrCode,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

function formatPrice(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default function SettingsPage() {
  const [pixDiscountPercent, setPixDiscountPercent] = useState<string>("5");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/settings");
        const data = await res.json();
        if (data.success && data.data?.PIX_DISCOUNT_PERCENT !== undefined) {
          setPixDiscountPercent(data.data.PIX_DISCOUNT_PERCENT);
        }
      } catch {
        toast.error("Erro ao carregar configurações.");
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    const num = parseFloat(pixDiscountPercent);
    if (isNaN(num) || num < 0 || num > 100) {
      toast.error("O desconto deve ser um número entre 0 e 100.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ PIX_DISCOUNT_PERCENT: String(num) }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Configurações salvas com sucesso!");
        setPixDiscountPercent(String(num));
      } else {
        toast.error(data.error || "Erro ao salvar.");
      }
    } catch {
      toast.error("Erro de conexão ao salvar configurações.");
    } finally {
      setSaving(false);
    }
  };

  const discountNum = parseFloat(pixDiscountPercent) || 0;
  const examplePrice = 1000;
  const exampleDiscount = examplePrice * (discountNum / 100);
  const exampleFinal = examplePrice - exampleDiscount;

  return (
    <div className="space-y-6 max-w-2xl pt-2 md:pt-0">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Settings className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Configurações Gerais
          </h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Parâmetros globais que afetam toda a operação da loja.
        </p>
      </div>

      <Separator />

      {/* Card PIX Discount */}
      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <QrCode className="h-5 w-5 text-emerald-600" />
            Desconto para Pagamento via PIX
          </CardTitle>
          <CardDescription>
            Percentual de desconto aplicado automaticamente quando o cliente
            finaliza o pedido via PIX. Aplica-se a todos os produtos com venda
            local. Para desabilitar, defina como{" "}
            <code className="text-xs font-mono bg-muted px-1 rounded">0</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando...
            </div>
          ) : (
            <>
              {/* Input */}
              <div className="space-y-2">
                <Label htmlFor="pix-discount" className="text-sm font-semibold">
                  Percentual de Desconto PIX (%)
                </Label>
                <div className="relative max-w-[200px]">
                  <Input
                    id="pix-discount"
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={pixDiscountPercent}
                    onChange={(e) => setPixDiscountPercent(e.target.value)}
                    className="pr-8 font-semibold text-lg"
                    placeholder="5"
                  />
                  <Percent className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
                {discountNum > 0 ? (
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Desconto PIX ativo: {discountNum}% de desconto à vista
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Info className="h-3.5 w-3.5" />
                    Desconto PIX desabilitado (0%)
                  </p>
                )}
              </div>

              {/* Preview */}
              {discountNum > 0 && (
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-4 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
                    Preview — Como aparece para o cliente
                  </p>

                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Subtotal do carrinho</span>
                      <span>{formatPrice(examplePrice)}</span>
                    </div>
                    <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 font-medium">
                      <span className="flex items-center gap-1.5">
                        <QrCode className="h-3.5 w-3.5" />
                        Desconto PIX ({discountNum}%)
                      </span>
                      <span>- {formatPrice(exampleDiscount)}</span>
                    </div>
                    <Separator className="opacity-40" />
                    <div className="flex items-center justify-between font-bold text-base">
                      <span>Total no PIX</span>
                      <Badge className="bg-emerald-600 text-white text-sm px-3 py-0.5">
                        {formatPrice(exampleFinal)}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-[11px] text-muted-foreground">
                    * Preço de exemplo com produto de {formatPrice(examplePrice)}. O frete não recebe desconto.
                  </p>
                </div>
              )}

              {/* Salvar */}
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? "Salvando..." : "Salvar Configurações"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
