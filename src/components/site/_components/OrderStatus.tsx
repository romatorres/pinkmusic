"use client";

import React from "react";
import { Check, Clock, CreditCard, PackageSearch, Truck, Store, PackageCheck, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type OrderStatusType =
  | "PENDING_PAYMENT"
  | "PAID"
  | "PREPARING"
  | "DISPATCHED"
  | "DELIVERED"
  | "CANCELLED";

interface StepDef {
  key: OrderStatusType;
  label: string;
  description: string;
  icon: React.ElementType;
}

interface OrderStatusProps {
  status: OrderStatusType;
  deliveryType?: "delivery" | "pickup" | string;
  compact?: boolean;
  className?: string;
}

const deliverySteps: StepDef[] = [
  { key: "PENDING_PAYMENT", label: "Aguardando pagamento PIX", description: "Realize o pagamento via PIX para confirmar seu pedido.", icon: Clock },
  { key: "PAID", label: "Pagamento confirmado", description: "Otimo! Seu pagamento foi recebido.", icon: CreditCard },
  { key: "PREPARING", label: "Em separacao na loja", description: "Estamos preparando seu pedido com cuidado.", icon: PackageSearch },
  { key: "DISPATCHED", label: "A caminho - Entrega local", description: "Seu pedido saiu para entrega em Feira de Santana.", icon: Truck },
  { key: "DELIVERED", label: "Entregue", description: "Pedido entregue. Aproveite!", icon: PackageCheck },
];

const pickupSteps: StepDef[] = [
  { key: "PENDING_PAYMENT", label: "Aguardando pagamento PIX", description: "Realize o pagamento via PIX para confirmar seu pedido.", icon: Clock },
  { key: "PAID", label: "Pagamento confirmado", description: "Otimo! Seu pagamento foi recebido.", icon: CreditCard },
  { key: "PREPARING", label: "Em separacao", description: "Estamos preparando seu pedido para retirada.", icon: PackageSearch },
  { key: "DISPATCHED", label: "Pronto para retirada no balcao", description: "Seu pedido esta pronto! Compareça a loja para retirar.", icon: Store },
  { key: "DELIVERED", label: "Retirado na loja", description: "Pedido retirado com sucesso. Aproveite!", icon: PackageCheck },
];

export function OrderStatus({ status, deliveryType = "delivery", compact = false, className }: OrderStatusProps) {
  const isPickup = deliveryType === "pickup";
  const steps = isPickup ? pickupSteps : deliverySteps;

  if (status === "CANCELLED") {
    if (compact) {
      return (
        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold bg-destructive/10 text-destructive border border-destructive/20", className)}>
          <XCircle className="size-3" />
          Cancelado
        </span>
      );
    }
    return (
      <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 text-destructive text-sm font-semibold">
        <XCircle className="size-5 shrink-0" />
        Pedido cancelado
      </div>
    );
  }

  const idx = steps.findIndex((s) => s.key === status);
  const currentStepIndex = idx >= 0 ? idx : 0;
  const isDone = currentStepIndex === steps.length - 1;

  if (compact) {
    const cur = steps[currentStepIndex];
    let badgeClass = "bg-primary/10 text-primary border-primary/20";
    if (status === "PENDING_PAYMENT") badgeClass = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    else if (isDone) badgeClass = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    else if (status === "PAID" || status === "PREPARING") badgeClass = "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";

    return (
      <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold border", badgeClass, className)}>
        <span className="size-1.5 rounded-full bg-current animate-pulse" />
        {cur?.label}
      </span>
    );
  }

  return (
    <ol className={cn("space-y-0", className)}>
      {steps.map((s, i) => {
        const done = i <= currentStepIndex;
        const isCurrent = i === currentStepIndex;
        const Icon = s.icon;
        return (
          <li key={s.key} className="relative flex gap-4 pb-6 last:pb-0">
            {i < steps.length - 1 && (
              <span className={cn("absolute left-[15px] top-8 h-[calc(100%-28px)] w-0.5 transition-colors duration-500", i < currentStepIndex ? "bg-primary" : "bg-border")} />
            )}
            <span className={cn("relative z-10 grid size-8 shrink-0 place-items-center rounded-full border-2 transition-all duration-300", done ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border bg-card text-muted-foreground")}>
              {done ? (
                isCurrent && !isDone ? <Icon className="size-3.5 stroke-[2]" /> : <Check className="size-3.5 stroke-[2.5]" />
              ) : (
                <span className="size-2 rounded-full bg-muted-foreground/40" />
              )}
            </span>
            <div className="pt-0.5 min-w-0">
              <p className={cn("text-sm font-semibold leading-tight transition-colors", isCurrent ? "text-primary" : done ? "text-foreground" : "text-muted-foreground")}>
                {s.label}
              </p>
              {isCurrent && (
                <p className="mt-0.5 text-xs text-muted-foreground leading-snug">{s.description}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
